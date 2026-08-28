'use server';

import { createClient } from '../supabase/server';
import { BlingService } from '../services/blingService';
import { extractMeasurementsFromName, extractPartTypeFromName, extractCodesFromName, extractBrandFromName, extractCategoryFromName } from '../utils/measurementParser';
import type { SealFamily, StockProduct } from '../types/database';

export async function syncBlingCategoriesAction() {
  try {
    const categories = await BlingService.getAllCategories();
    if (!categories || categories.length === 0) {
      return { success: true, message: 'Nenhuma categoria encontrada no Bling.' };
    }

    const supabase = await createClient();

    let createdCount = 0;
    let updatedCount = 0;

    for (const cat of categories) {
      const blingId = cat.id;
      const name = cat.descricao; // Bling returns description for category name

      // Try to upsert based on bling_id
      const { data: existing } = await supabase.from('seal_families').select('id').eq('bling_id', blingId).single();

      if (existing) {
        const { error } = await supabase.from('seal_families').update({ name }).eq('bling_id', blingId);
        if (!error) updatedCount++;
      } else {
        // If there's no matching bling_id, try to match by name (incase they created it manually first)
        const { data: existingByName } = await supabase.from('seal_families').select('id').eq('name', name).single();
        if (existingByName) {
          const { error } = await supabase.from('seal_families').update({ bling_id: blingId }).eq('id', existingByName.id);
          if (!error) updatedCount++;
        } else {
          const { error } = await supabase.from('seal_families').insert([{ name, bling_id: blingId }]);
          if (!error) createdCount++;
        }
      }
    }

    return { success: true, message: `Sincronização concluída. ${createdCount} criadas, ${updatedCount} atualizadas.` };
  } catch (err: any) {
    console.error('syncBlingCategoriesAction error:', err);
    return { success: false, error: err.message };
  }
}

export async function syncBlingProductsAction() {
  try {
    // For now we just fetch them. In Phase 4 we will parse them.
    const products = await BlingService.getAllProducts();
    if (!products || products.length === 0) {
      return { success: true, message: 'Nenhum produto encontrado no Bling.' };
    }

    const productSuppliersLinks = await BlingService.getAllProductSuppliers();
    const productSupplierMap = new Map<string, any>(); // bling_product_id -> fornecedor object
    for (const link of productSuppliersLinks) {
      if (link.produto?.id && link.fornecedor) {
        // If we already mapped one, prefer 'padrao' === true, otherwise just keep the first one
        const existing = productSupplierMap.get(link.produto.id.toString());
        if (!existing || link.padrao) {
          productSupplierMap.set(link.produto.id.toString(), link);
        }
      }
    }

    const supabase = await createClient();
    let createdCount = 0;
    let updatedCount = 0;

    // Fetch existing suppliers to map fornecedores
    const { data: suppliersData } = await supabase.from('suppliers').select('id, name, bling_id');
    const suppliers = suppliersData || [];

    // Fetch existing seal families to map category names
    const { data: families } = await supabase.from('seal_families').select('name, bling_id');
    const familyMap = new Map();
    if (families) {
      families.forEach(f => {
        if (f.bling_id) familyMap.set(f.bling_id.toString(), f.name);
      });
    }

    // Buscar IDs existentes para mapeamento (lidando com paginação do Supabase que corta no 1000)
    let allExistingData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const { data } = await supabase.from('stock_products').select('id, bling_id, measurements, brand').not('bling_id', 'is', null).range(page * pageSize, (page + 1) * pageSize - 1);
      if (!data || data.length === 0) break;
      allExistingData = allExistingData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }

    const existingMap = new Map();
    allExistingData.forEach(e => existingMap.set(e.bling_id.toString(), { id: e.id, location: e.measurements?.location, brand: e.brand }));

    const upsertBatch = [];

    for (const prod of products) {
      const blingId = prod.id.toString();
      const name = prod.nome;
      const code = prod.codigo; // SKU in Bling
      let price = parseFloat(prod.precoCusto || '0');

      const measurements = extractMeasurementsFromName(name);
      const partType = extractPartTypeFromName(name);
      const codes = extractCodesFromName(name);
      const brand = extractBrandFromName(name);
      
      const blingCatId = prod.categoria?.id?.toString();
      let categoryName = (blingCatId && familyMap.get(blingCatId)) || 'Desconhecida';
      
      // Fallback: se for Desconhecida, tenta inferir pelo nome
      if (categoryName === 'Desconhecida') {
        categoryName = extractCategoryFromName(name);
      }

      // Tenta mapear o fornecedor do Bling e puxar o custo real
      let supplierId = null;
      const linkedRecord = productSupplierMap.get(blingId);
      if (linkedRecord) {
        if (linkedRecord.precoCusto) {
          price = parseFloat(linkedRecord.precoCusto);
        }
        
        const blingFornecedorId = linkedRecord.fornecedor?.id;
        const blingFornecedorNome = linkedRecord.fornecedor?.nome;
        
        let match = suppliers.find(s => s.bling_id && s.bling_id === blingFornecedorId);
        if (!match && blingFornecedorNome) {
          const bName = blingFornecedorNome.toLowerCase().trim();
          match = suppliers.find(s => {
            const sName = s.name.toLowerCase().trim();
            return bName === sName || bName.includes(sName) || sName.includes(bName);
          });
        }
        if (match) {
          supplierId = match.id;
        }
      }

      const payload: any = {
        name,
        sku: code,
        code,
        cost_price: price,
        bling_id: blingId,
        category: categoryName,
        part_type: partType || null,
        measurements: measurements || {},
        oem_code: codes.oem_code || null,
        parker_code: codes.parker_code || null,
        supplier_code: codes.supplier_code || null,
        brand: brand || null,
        supplier_id: supplierId,
        updated_at: new Date().toISOString()
      };

      const existingData = existingMap.get(blingId);
      if (existingData) {
        if (existingData.location) {
          payload.measurements.location = existingData.location;
        }
        // Preserve the existing brand if the extracted brand is suspiciously short or if the existing brand is already good
        if (existingData.brand && (!payload.brand || payload.brand.length <= 2 || existingData.brand.length > 2)) {
          payload.brand = existingData.brand;
        }
        payload.id = existingData.id;
        updatedCount++;
      } else {
        payload.id = `prod_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        payload.created_at = new Date().toISOString();
        createdCount++;
      }
      upsertBatch.push(payload);
    }

    // Upsert in chunks of 1000 to avoid request size limits
    const chunkSize = 1000;
    for (let i = 0; i < upsertBatch.length; i += chunkSize) {
      const chunk = upsertBatch.slice(i, i + chunkSize);
      const { error } = await supabase.from('stock_products').upsert(chunk, { onConflict: 'id' });
      if (error) console.error('Error during bulk upsert:', error);
    }

    // Grava log de importação
    await supabase.from('import_logs').insert([{
      original_name: 'Sincronização Manual Completa',
      reason: `Criados: ${createdCount}, Atualizados: ${updatedCount}`
    }]);

    return { success: true, message: `Produtos sincronizados. ${createdCount} novos, ${updatedCount} atualizados.` };
  } catch (err: any) {
    console.error('syncBlingProductsAction error:', err);
    return { success: false, error: err.message };
  }
}

export async function syncBlingStockAction() {
  try {
    const supabase = await createClient();

    // Fetch all existing stock_products with pagination to avoid the 1000 rows limit
    let allExistingData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const { data } = await supabase.from('stock_products').select('*').not('bling_id', 'is', null).range(page * pageSize, (page + 1) * pageSize - 1);
      if (!data || data.length === 0) break;
      allExistingData = allExistingData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }

    if (allExistingData.length === 0) {
      return { success: true, message: 'Nenhum produto sincronizado no banco de dados para buscar estoque.' };
    }

    const existingMap = new Map();
    const blingIds: string[] = [];
    allExistingData.forEach(e => {
      existingMap.set(e.bling_id.toString(), e);
      blingIds.push(e.bling_id.toString());
    });

    let updatedCount = 0;
    const upsertBatch = [];

    // Fetch stock in chunks of 50 to avoid URL too long / rate limits
    const chunkSize = 50;
    for (let i = 0; i < blingIds.length; i += chunkSize) {
      const chunkIds = blingIds.slice(i, i + chunkSize);

      const balances = await BlingService.getStockBalancesForProducts(chunkIds);

      for (const bal of balances) {
        const blingProductId = bal.produto?.id?.toString();
        const totalStock = bal.saldoFisicoTotal || 0;

        if (blingProductId) {
          const existingRow = existingMap.get(blingProductId);
          if (existingRow) {
            upsertBatch.push({
              ...existingRow,
              stock: totalStock
            });
            updatedCount++;
          }
        }
      }

      // Sleep slightly to respect Bling limits
      await new Promise(res => setTimeout(res, 333));
    }

    if (upsertBatch.length > 0) {
      // Chunk upserts to DB
      const dbChunkSize = 1000;
      for (let i = 0; i < upsertBatch.length; i += dbChunkSize) {
        const dbChunk = upsertBatch.slice(i, i + dbChunkSize);
        const { error } = await supabase.from('stock_products').upsert(dbChunk, { onConflict: 'id' });
        if (error) console.error('Error during bulk stock upsert:', error);
      }
    }

    await supabase.from('import_logs').insert([{
      original_name: 'Sincronização de Saldos',
      reason: `Atualizados: ${updatedCount} produtos com saldo físico`
    }]);

    return { success: true, message: `Estoque sincronizado. ${updatedCount} itens atualizados com saldo real.` };
  } catch (err: any) {
    console.error('syncBlingStockAction error:', err);
    return { success: false, error: err.message };
  }
}

export async function syncBlingContactsAction() {
  try {
    const contacts = await BlingService.getAllContacts();
    if (!contacts || contacts.length === 0) {
      return { success: true, message: 'Nenhum contato encontrado no Bling.' };
    }

    const supabase = await createClient();
    let createdCount = 0;
    let updatedCount = 0;

    // Fetch existing clients to map by bling_id
    const { data: existingClients } = await supabase.from('clients').select('id, bling_id');
    const existingMapByBlingId = new Map();
    
    if (existingClients) {
      existingClients.forEach(c => {
        if (c.bling_id) existingMapByBlingId.set(c.bling_id.toString(), c.id);
      });
    }

    const upsertBatch = [];

    for (const contact of contacts) {
      const blingId = contact.id.toString();
      const name = contact.nome;
      const cnpj = contact.numeroDocumento || '';

      const payload: any = {
        name,
        cnpj,
        bling_id: blingId,
      };

      const existingId = existingMapByBlingId.get(blingId);
      if (existingId) {
        payload.id = existingId;
        updatedCount++;
      } else {
        createdCount++;
      }
      upsertBatch.push(payload);
    }

    const chunkSize = 1000;
    for (let i = 0; i < upsertBatch.length; i += chunkSize) {
      const chunk = upsertBatch.slice(i, i + chunkSize);
      const { error } = await supabase.from('clients').upsert(chunk, { onConflict: 'id' });
      if (error) console.error('Error during bulk clients upsert:', error);
    }

    await supabase.from('import_logs').insert([{
      original_name: 'Sincronização de Clientes (Contatos)',
      reason: `Criados: ${createdCount}, Atualizados: ${updatedCount}`
    }]);

    return { success: true, message: `Clientes sincronizados. ${createdCount} novos, ${updatedCount} atualizados.` };
  } catch (err: any) {
    console.error('syncBlingContactsAction error:', err);
    return { success: false, error: err.message };
  }
}

export async function syncSuppliersFromHardcodedListAction() {
  try {
    const supabase = await createClient();

    const suppliersToSync = [
      { bling_id: 18166979175, type: 'Fornecedor Original', name: 'USINA VEDACOES E ACESSORIOS INDUSTRIAIS LTDA' },
      { bling_id: 18166979682, type: 'Fornecedor Original', name: 'SP SEALS DISTRIBUIDORA LTDA' },
      { bling_id: 18166981906, type: 'Fornecedor Original', name: 'RIO PRETO DISTRIBUIDORA DE VEDACOES LTDA' },
      { bling_id: 18166984492, type: 'Fornecedor Original', name: 'TECVEDACOES COMERCIO DE VEDACOES E ACESSORIOS INDUSTRIAIS LT' },
      { bling_id: 18166984588, type: 'Mercado Local', name: 'VED PIRA COM.DE VEDACOES HIDRAULICAS E PNEUMATICAS LTDA ME' },
      { bling_id: 18166984689, type: 'Fornecedor Original', name: 'SKL DISTRIBUIDORA DE VEDACOES INDUSTRIAIS LTDA' },
      { bling_id: 18180417442, type: 'Mercado Local', name: 'ZOTELLI COM VEDACOES HIDRAULICAS' },
      { bling_id: 18180417930, type: 'Fornecedor Original', name: 'PARKITS VEDACOES HIDRAULICAS E PNEUMATICAS LTDA' },
      { bling_id: 18219032503, type: 'Mercado Local', name: 'REAL VEDACOES INDUSTRIA E COMERCIO LTDA' },
      { bling_id: 18221954746, type: 'Mercado Local', name: 'MFC DISTRIBUIDORA HIDRAULICA LTDA' },
      { bling_id: 18240304442, type: 'Fornecedor Original', name: 'SIPPEL SUPRIMENTOS E ACESSORIOS IND LTDA' },
      { bling_id: 18268385717, type: 'Fornecedor Original', name: 'LIBEL COMERCIO DE COMPONENTES DE VEDACAO LTDA.' },
      { bling_id: 18278746092, type: 'Fornecedor Original', name: 'SKS USINAGEM E VEDACOES HIDRAULICA LTDA' },
      { bling_id: 18278941418, type: 'Fornecedor Original', name: 'NORD RETENTORES LTDA' },
      { bling_id: 18287198560, type: 'Fornecedor Original', name: 'CENTER SEALS- COMERCIO DE VEDACOES LTDA' },
      { bling_id: 18287198687, type: 'Fornecedor Original', name: 'Comercio de Polimeros Industriais do Brasil Copolbra Ltda' },
      { bling_id: 18309603230, type: 'Fornecedor Original', name: 'PK2 VEDACOES COMERCIO DE BORRACHAS E PLASTICOS LTDA' },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const sup of suppliersToSync) {
      // Buscar o fornecedor atualizado direto do Bling
      const contactFromBling = await BlingService.getContact(sup.bling_id.toString());
      
      if (contactFromBling && contactFromBling.nome) {
        const supplierName = contactFromBling.nome;
        
        // Tenta achar pelo bling_id no banco
        const { data: existing } = await supabase.from('suppliers').select('id').eq('bling_id', sup.bling_id).single();
        
        if (existing) {
          const { error } = await supabase.from('suppliers').update({ name: supplierName, type: sup.type }).eq('id', existing.id);
          if (!error) updatedCount++;
        } else {
          // Se não tiver pelo bling_id, cria um novo
          const payload = {
            id: `sup_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            name: supplierName,
            type: sup.type,
            bling_id: sup.bling_id,
            created_at: new Date().toISOString()
          };
          const { error } = await supabase.from('suppliers').insert([payload]);
          if (!error) createdCount++;
        }
      }
    }

    return { success: true, message: `Fornecedores base sincronizados: ${createdCount} criados, ${updatedCount} atualizados.` };
  } catch (err: any) {
    console.error('syncSuppliersFromHardcodedListAction error:', err);
    return { success: false, error: err.message };
  }
}
