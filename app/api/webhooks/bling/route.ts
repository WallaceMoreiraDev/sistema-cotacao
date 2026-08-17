import { NextResponse } from 'next/server';
import { BlingService } from '../../../lib/services/blingService';
import { createClient } from '../../../lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Webhook Bling Recebido:', JSON.stringify(body, null, 2));

    const data = body.data;
    if (!data) return NextResponse.json({ success: true, message: 'Nenhum dado encontrado no payload.' });

    const eventos = Array.isArray(data) ? data : [data];

    for (const evt of eventos) {
      // O Bling pode enviar tipo como 'contatos', 'produtos', 'estoques', 'categorias'
      const tipo = evt.tipo || evt.module; // Evitando problemas de nomenclatura
      const blingId = evt.id;

      if (!blingId) continue;

      if (tipo === 'contatos') {
        await processContactWebhook(blingId);
      }
      // Na Etapa 2, adicionaremos os handlers para produtos, categorias e estoques.
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
    const contact = await BlingService.getContact(blingId.toString());
    if (!contact) {
      console.log(`Contato ${blingId} não encontrado no Bling (pode ter sido excluído).`);
      return;
    }

    // Se o contato for excluído, o status é 'E'
    if (contact.situacao === 'E') {
      console.log(`Contato ${blingId} está excluído no Bling. Ignorando.`);
      return;
    }

    const supabase = await createClient();
    
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
