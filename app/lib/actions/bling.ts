'use server';

import { createClient } from '../supabase/server';
import { BlingService } from '../services/blingService';
import { insertLogAction } from './logs';

/**
 * Enviar para Bling Action
 * Completes the protocol (status 'finalizado'). Note: validation of items must be done on the client or before this call.
 */
export async function enviarParaBlingAction(protocolId: string | number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Fetch protocol
    const { data: protocol, error: pErr } = await supabase.from('protocols').select('*').eq('id', Number(protocolId)).single();
    if (pErr || !protocol) {
      console.error('Erro ao buscar protocolo:', pErr);
      throw new Error('Protocolo não encontrado.');
    }

    // Try to find client bling_id
    let blingClientId = null;
    if (protocol.client_name) {
      const { data: client } = await supabase.from('clients').select('bling_id').eq('name', protocol.client_name).single();
      if (client && client.bling_id) {
        blingClientId = client.bling_id;
      }
    }

    // Fetch protocol items
    const { data: items, error: iErr } = await supabase.from('protocol_items').select('*').eq('protocol_id', Number(protocolId));
    if (iErr) throw new Error('Erro ao buscar itens.');

    if (!items || items.length === 0) {
      throw new Error('Protocolo vazio.');
    }

    // Create Proposal items list
    const blingItems = [];

    for (const item of items) {
      // Get the product bling_id. If it's a stock item, it should have it in stock_products.
      let blingProductId = null;

      if (item.product_id) {
        // Find in stock_products
        const { data: stockProd } = await supabase.from('stock_products').select('bling_id').eq('id', item.product_id).single();
        if (stockProd && stockProd.bling_id) {
          blingProductId = stockProd.bling_id;
        }
      }

      // If still no blingProductId (e.g. custom item "A Cotar"), we must create it in Bling!
      if (!blingProductId) {
        try {
          const newProd = await BlingService.createProduct({
            nome: item.name,
            tipo: 'P',
            formato: 'S',
            preco: item.sale_price || item.unit_price,
            situacao: 'A',
            marca: item.brand || '',
            unidade: 'UN',
            tipoItem: '00',
            tributacao: {
              origem: 0,
              ncm: '4016.93.00',
              cest: '01.007.00'
            }
          });
          blingProductId = newProd.id;
          
          let bestSupplierId = item.forced_supplier_id;
          let bestCost = item.unit_price || 0;

          if (!bestSupplierId && item.supplier_costs) {
            let minCost = Infinity;
            for (const [supId, cost] of Object.entries(item.supplier_costs)) {
              if (typeof cost === 'number' && cost < minCost) {
                minCost = cost;
                bestSupplierId = supId;
              }
            }
          }

          if (bestSupplierId) {
            const { data: supData } = await supabase.from('suppliers').select('bling_id').eq('id', bestSupplierId).single();
            if (supData && supData.bling_id) {
              await BlingService.addSupplierToProduct(blingProductId, supData.bling_id, bestCost);
            }
          }
        } catch (prodErr) {
          console.error('Erro ao criar produto no Bling:', prodErr);
          throw new Error(`Falha ao criar o produto "${item.name}" no Bling.`);
        }
      }

      blingItems.push({
        produto: { id: Number(blingProductId) },
        quantidade: item.quantity,
        valor: item.sale_price || item.unit_price
      });
    }

    // Now create the Proposal in Bling
    const propostaData = {
      contato: blingClientId ? { id: Number(blingClientId) } : { nome: protocol.client_name },
      situacao: 0, // Pendente/Em Aberto
      itens: blingItems
    };

    await BlingService.createPropostaComercial(propostaData);
    
    // Update status in our DB
    const { error: updateErr } = await supabase
      .from('protocols')
      .update({ status: 'finalizado', updated_at: new Date().toISOString() })
      .eq('id', Number(protocolId));
      
    if (updateErr) throw updateErr;
    
    await insertLogAction(protocolId, 'status_change', 'Protocolo Efetivado no Bling (Finalizado e Proposta Criada).');

    return { success: true };
  } catch (err: any) {
    console.error('[enviarParaBling] Exception:', err);
    return { success: false, error: err?.message || 'Falha ao enviar para o Bling.' };
  }
}
