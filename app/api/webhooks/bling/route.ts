import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

/**
 * Webhook para receber atualizações do Bling em tempo real.
 * Requisito: A URL deve estar exposta publicamente (ex: Vercel) para que o Bling consiga enviar o POST.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // O formato exato depende do que você configura no Bling (ex: retorno JSON de 'estoques')
    // Exemplo de estrutura padrão recebida (simplificada):
    // { "retorno": { "estoques": [ { "estoque": { "idProduto": 1234, "saldoFisico": 15 } } ] } }

    const supabase = await createClient();

    // Lógica para interceptar as mudanças e gravar:
    // 1. Gravar em import_logs que recebemos o Webhook
    await supabase.from('import_logs').insert([{
      original_name: 'Webhook Recebido (Auto-Sync)',
      reason: 'Bling enviou atualização via Webhook'
    }]);

    // TODO: Extrair os IDs de produtos que vieram na requisição e atualizar a tabela stock_products.
    // Exemplo:
    // for (const item of payload.retorno.estoques) {
    //   await supabase.from('stock_products').update({ stock: item.estoque.saldoFisico }).eq('bling_id', item.estoque.idProduto);
    // }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Webhook Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
