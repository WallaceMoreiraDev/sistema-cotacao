import { NextResponse } from 'next/server';
import { BlingService } from '../../../lib/services/blingService';
import { createClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';

export async function GET(req: Request) {
  console.log('Webhook Bling (GET) Teste recebido com sucesso no terminal!');
  return NextResponse.json({ success: true, message: 'O túnel está funcionando! O Next.js recebeu a requisição.' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Webhook Bling Recebido:', JSON.stringify(body, null, 2));

    const eventName = body.event;
    const data = body.data;
    
    if (!data) return NextResponse.json({ success: true, message: 'Nenhum dado encontrado no payload.' });

    const eventos = Array.isArray(data) ? data : [data];

    for (const evt of eventos) {
      // In V3, the ID is in evt.id, evt.retorno?.id, or evt.produto?.id depending on the endpoint
      const blingId = evt.id || (evt.retorno && evt.retorno.id) || (evt.produto && evt.produto.id);

      if (!blingId) {
         console.log('ID do Bling não encontrado no evento:', evt);
         continue;
      }

      console.log(`Processando evento ${eventName} para ID ${blingId}`);

      if (eventName === 'contact.created' || eventName === 'contact.updated' || eventName === 'contacts.created' || eventName === 'contacts.updated') {
        await processContactWebhook(blingId);
      } else if (eventName === 'product.created' || eventName === 'product.updated' || eventName === 'products.created' || eventName === 'products.updated') {
        await processProductWebhook(blingId);
      } else if (eventName === 'product.deleted' || eventName === 'products.deleted') {
        await processProductDeletedWebhook(blingId);
      } else if (eventName === 'category.created' || eventName === 'category.updated' || eventName === 'categories.created' || eventName === 'categories.updated') {
        await processCategoryWebhook(blingId);
      } else if (eventName === 'stock.created' || eventName === 'stock.updated' || eventName === 'stocks.created' || eventName === 'stocks.updated' || eventName === 'product.stock.updated' || eventName === 'products.stocks.updated') {
        // Stock event could pass product ID in evt.produto.id
        const productId = evt.produto?.id || blingId;
        await processStockWebhook(productId);
      } else if (eventName === 'product_supplier.created' || eventName === 'product_supplier.updated') {
        // Fornecedor vinculado ao produto. Atualizar produto/estoque.
        const productId = evt.produto?.id || blingId;
        await processProductWebhook(productId);
      } else {
        console.log(`Evento ${eventName} ignorado (sem handler mapeado).`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro no processamento do webhook Bling:', error);
    // Sempre retornar 200 pro Bling não ficar tentando reenviar em caso de erros internos nossos não críticos.
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}

async function processContactWebhook(blingId: string | number) {
  try {
    console.log(`Buscando contato ${blingId} na API do Bling...`);
    const contact = await BlingService.getContact(blingId.toString());
    if (!contact) {
      console.log(`Contato ${blingId} não encontrado no Bling (pode ter sido excluído).`);
      return;
    }

    console.log(`Contato encontrado: ${contact.nome}`);

    // Se o contato for excluído, o status é 'E'
    if (contact.situacao === 'E') {
      console.log(`Contato ${blingId} está excluído no Bling. Ignorando.`);
      return;
    }

    // Usar a Service Role Key para ignorar RLS
    const supabase = createAdminClient();
    
    const nome = contact.nome;
    const cnpj_cpf = contact.numeroDocumento || '';

    // Verifica se já existe pelo bling_id
    const { data: existing } = await supabase.from('clients').select('id').eq('bling_id', blingId).single();

    if (existing) {
      await supabase.from('clients').update({ name: nome, cnpj: cnpj_cpf }).eq('id', existing.id);
      console.log(`Cliente atualizado via webhook: ${nome} (Bling ID: ${blingId})`);
    } else {
      // Tenta achar pelo CNPJ/CPF para mesclar se já existia
      if (cnpj_cpf) {
         const { data: existingCnpj } = await supabase.from('clients').select('id').eq('cnpj', cnpj_cpf).single();
         if (existingCnpj) {
           await supabase.from('clients').update({ bling_id: blingId, name: nome }).eq('id', existingCnpj.id);
           console.log(`Cliente mesclado via CNPJ webhook: ${nome} (Bling ID: ${blingId})`);
           return;
         }
      }
      // Se não existe, cria novo
      await supabase.from('clients').insert([{ name: nome, cnpj: cnpj_cpf, bling_id: blingId }]);
      console.log(`Novo cliente inserido via webhook: ${nome} (Bling ID: ${blingId})`);
    }
  } catch (err: any) {
    console.error(`Erro ao processar contato ${blingId}:`, err.message);
  }
}

async function processProductWebhook(blingId: string | number) {
  try {
    console.log(`Buscando produto ${blingId} na API do Bling...`);
    const product = await BlingService.getProduct(blingId.toString());
    
    // Se o Bling retornar 404 (não encontrou), assumimos que foi excluído fisicamente
    if (!product) {
      console.log(`Produto ${blingId} não encontrado na API do Bling. Tentando excluir do banco local...`);
      await processProductDeletedWebhook(blingId);
      return;
    }

    // O Bling usa "Soft Delete" (situacao: "E") quando o usuário clica em apagar.
    // Também podemos ignorar ou ocultar os inativos (situacao: "I") se desejado, 
    // mas "E" definitivamente deve ser deletado.
    if (product.situacao === 'E') {
      console.log(`Produto ${blingId} está com situação Excluído (E) no Bling. Excluindo do banco local...`);
      await processProductDeletedWebhook(blingId);
      return;
    }

    // Use Service Role to bypass RLS
    const supabase = createAdminClient();

    // Extract measurements from name using our util
    const { extractMeasurementsFromName, extractPartTypeFromName, extractCodesFromName, extractBrandFromName, extractCategoryFromName } = require('../../../lib/utils/measurementParser');
    
    const name = product.nome;
    const code = product.codigo;
    const price = parseFloat(product.preco || '0');
    
    const measurements = extractMeasurementsFromName(name);
    const partType = extractPartTypeFromName(name);
    const codes = extractCodesFromName(name);
    const brand = extractBrandFromName(name);
    
    let categoryName = 'Desconhecida';
    if (product.categoria && product.categoria.id) {
      const { data: family } = await supabase.from('seal_families').select('name').eq('bling_id', product.categoria.id).single();
      if (family) categoryName = family.name;
    }
    if (categoryName === 'Desconhecida') {
      categoryName = extractCategoryFromName(name);
    }
    
    // Buscar estoque inicial (pois se o usuário colocou estoque na tela de criação, o bling não manda webhook de estoque separado)
    let currentStock = 0;
    try {
      // Pequeno delay para garantir que o Bling processou o estoque inicial no banco deles antes da nossa requisição
      await new Promise(resolve => setTimeout(resolve, 1500));
      const balance = await BlingService.getStockBalance(blingId.toString());
      if (balance) {
        currentStock = balance.saldoFisicoTotal || 0;
      }
    } catch (e) {
      // Ignora erro se não tiver saldo ainda
    }

    const payload: any = {
      name,
      sku: code,
      code,
      cost_price: price,
      stock: currentStock,
      bling_id: blingId.toString(),
      category: categoryName,
      part_type: partType || null,
      measurements: measurements || {},
      oem_code: codes.oem_code || null,
      parker_code: codes.parker_code || null,
      supplier_code: codes.supplier_code || null,
      brand: brand || null,
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase.from('stock_products').select('id').eq('bling_id', blingId).single();
    if (existing) {
      await supabase.from('stock_products').update(payload).eq('id', existing.id);
      console.log(`Produto atualizado via Webhook: ${name}`);
    } else {
      payload.id = `prod_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      await supabase.from('stock_products').insert([payload]);
      console.log(`Novo produto inserido via Webhook: ${name}`);
    }
  } catch (err: any) {
    console.error(`Erro ao processar produto ${blingId}:`, err.message);
  }
}

async function processProductDeletedWebhook(blingId: string | number) {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from('stock_products').delete().eq('bling_id', blingId.toString());
    if (!error) {
      console.log(`Produto excluído com sucesso via Webhook (Bling ID: ${blingId})`);
    } else {
      console.error(`Falha ao excluir produto (Bling ID: ${blingId}):`, error.message);
    }
  } catch (err: any) {
    console.error(`Erro ao processar exclusão de produto ${blingId}:`, err.message);
  }
}

async function processCategoryWebhook(blingId: string | number) {
  try {
    console.log(`Buscando categoria ${blingId} na API do Bling...`);
    const cat = await BlingService.getCategory(blingId.toString());
    if (!cat) return;

    const supabase = createAdminClient();

    const name = cat.descricao;

    const { data: existing } = await supabase.from('seal_families').select('id').eq('bling_id', blingId).single();
    if (existing) {
      await supabase.from('seal_families').update({ name }).eq('id', existing.id);
    } else {
      await supabase.from('seal_families').insert([{ name, bling_id: blingId }]);
    }
    console.log(`Categoria processada via Webhook: ${name}`);
  } catch (err: any) {
    console.error(`Erro ao processar categoria ${blingId}:`, err.message);
  }
}

async function processStockWebhook(produtoId: string | number) {
  try {
    console.log(`Buscando saldo de estoque do produto ${produtoId} na API do Bling...`);
    const balance = await BlingService.getStockBalance(produtoId.toString());
    if (!balance) return;

    const supabase = createAdminClient();

    const totalStock = balance.saldoFisicoTotal || 0;

    const { data: existing } = await supabase.from('stock_products').select('id, name').eq('bling_id', produtoId).single();
    if (existing) {
      await supabase.from('stock_products').update({ stock: totalStock }).eq('id', existing.id);
      console.log(`Estoque atualizado via Webhook: ${existing.name} -> Saldo: ${totalStock}`);
    } else {
      console.log(`Produto ${produtoId} ainda não existe no banco, buscando dados do produto primeiro...`);
      await processProductWebhook(produtoId);
      // Tentativa 2 após criar o produto
      const { data: newExisting } = await supabase.from('stock_products').select('id').eq('bling_id', produtoId).single();
      if (newExisting) {
        await supabase.from('stock_products').update({ stock: totalStock }).eq('id', newExisting.id);
        console.log(`Estoque atualizado via Webhook após criação: Saldo ${totalStock}`);
      }
    }
  } catch (err: any) {
    console.error(`Erro ao processar estoque ${produtoId}:`, err.message);
  }
}
