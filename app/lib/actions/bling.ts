'use server';

import { createClient } from '../supabase/server';
import { BlingService, BlingApiError } from '../services/blingService';
import { insertLogAction } from './logs';
import { insertSystemErrorAction } from './systemErrors';
import { generateFMCode } from '../utils/productNameBuilder';

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
    let clientRowId = null;
    let clientCnpj = null;

    if (protocol.client_name) {
      const { data: client } = await supabase.from('clients').select('id, bling_id, cnpj').eq('name', protocol.client_name).single();
      if (client) {
        clientRowId = client.id;
        clientCnpj = client.cnpj;
        if (client.bling_id) {
          blingClientId = client.bling_id;
        }
      }
    }

    // If still no blingClientId, create the contact in Bling!
    if (!blingClientId && protocol.client_name) {
      try {
        await new Promise(resolve => setTimeout(resolve, 600)); // Rate limit protection
        
        let tipoPessoa = 'J';
        if (clientCnpj) {
          const cleanDoc = clientCnpj.replace(/\D/g, '');
          if (cleanDoc.length === 11) tipoPessoa = 'F';
        }

        const contactPayload: any = {
          nome: protocol.client_name,
          tipo: tipoPessoa,
          situacao: 'A'
        };

        if (clientCnpj) {
          contactPayload.numeroDocumento = clientCnpj;
        }

        const newContact = await BlingService.createContact(contactPayload);
        blingClientId = newContact.id;
        
        if (clientRowId) {
          await supabase.from('clients').update({ bling_id: newContact.id }).eq('id', clientRowId);
        }
      } catch (err: any) {
        console.error('Erro ao criar contato automático no Bling', err);
        throw new Error(`O cliente '${protocol.client_name}' não possui vínculo no Bling e ocorreu um erro ao tentar criá-lo automaticamente: ${err.message}`);
      }
    }

    if (!blingClientId) {
      throw new Error(`O cliente do protocolo não é válido ou não pôde ser criado no Bling.`);
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
      // Removed loop-level delay; we delay exactly before API calls now to prevent slowing down cached items.

      // Get the product bling_id. If it's a stock item, it should have it in stock_products.
      let blingProductId = null;

      if (item.product_id) {
        // Find in stock_products
        const { data: stockProd } = await supabase.from('stock_products').select('bling_id').eq('id', item.product_id).single();
        if (stockProd && stockProd.bling_id) {
          blingProductId = stockProd.bling_id;
        }
      }

      if (!blingProductId && item.measurements?.bling_id) {
        blingProductId = item.measurements.bling_id;
      }

      // If still no blingProductId (e.g. custom item "A Cotar"), reuse an existing Bling product with the
      // same SKU or create it. Bling enforces unique `codigo`, so blindly creating fails on re-sends.
      if (!blingProductId) {
        try {
          // Delay explicitly before Bling API calls to avoid rate limit issues across processes
          await new Promise(resolve => setTimeout(resolve, 600));
          
          const fallbackCode = generateFMCode({ 
            category: item.category || '', 
            measurements: item.measurements, 
            supplierCode: item.supplier_code || undefined,
            brand: item.brand || undefined
          });
          const productCode: string | undefined = (item.code || fallbackCode || '').trim() || undefined;

          // 1) Reuse an existing product with the same code (e.g. created by a previous attempt or another protocol)
          let createdNow = false;
          if (productCode) {
            const existing = await BlingService.findProductByCode(productCode);
            if (existing) blingProductId = existing.id;
          }

          // 2) Create it only when it doesn't exist yet
          if (!blingProductId) {
            try {
              if (productCode) {
                // We just did a findProductByCode call above, so we delay again before create
                await new Promise(resolve => setTimeout(resolve, 600));
              }
              const newProd = await BlingService.createProduct({
                nome: item.name,
                codigo: productCode,
                tipo: 'P',
                formato: 'S',
                condicao: 1, // 1 = Novo
                tipoProducao: 'T', // T = Terceiros
                preco: item.sale_price || item.unit_price,
                situacao: 'A',
                marca: item.brand || '',
                unidade: 'UN',
                tributacao: {
                  origem: 0,
                  ncm: '4016.93.00',
                  cest: '01.007.00',
                  spedTipoItem: '00'
                }
              });
              blingProductId = newProd.id;
              createdNow = true;
            } catch (createErr) {
              // 3) Race/edge case: code got registered between lookup and creation → resolve by code
              if (productCode && BlingService.isDuplicateCodeError(createErr)) {
                await new Promise(resolve => setTimeout(resolve, 600));
                const existing = await BlingService.findProductByCode(productCode);
                if (!existing) throw createErr;
                blingProductId = existing.id;
              } else {
                throw createErr;
              }
            }
          }
          
          // Save the bling_id into the database to prevent duplication if a later item fails
          await supabase.from('protocol_items').update({ 
            measurements: { ...(item.measurements || {}), bling_id: blingProductId } 
          }).eq('id', item.id);
          
          // Supplier link only for products we just created; existing products keep their own suppliers
          if (createdNow) {
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
                await new Promise(resolve => setTimeout(resolve, 600));
                await BlingService.addSupplierToProduct(blingProductId, supData.bling_id, bestCost);
              }
            }
          }
        } catch (prodErr: any) {
          console.error('Erro ao criar produto no Bling:', prodErr);
          
          let blingErrorMsg = 'Erro desconhecido ao criar produto no Bling.';
          if (prodErr instanceof BlingApiError) {
            blingErrorMsg = prodErr.readableMessage;
          } else if (prodErr?.message) {
            blingErrorMsg = prodErr.message;
          }

          // Salva log administrativo de erro
          await insertSystemErrorAction({
            error_type: 'bling_api_product',
            message: `Falha ao criar o produto "${item.name}" no Bling: ${blingErrorMsg}`,
            details: prodErr instanceof BlingApiError ? prodErr.body : prodErr?.message,
            protocol_id: protocolId
          });

          throw new Error(`Item "${item.name}": ${blingErrorMsg}`);
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
      contato: { id: Number(blingClientId) },
      itens: blingItems
    };

    try {
      // Delay explicitly before Bling API call
      await new Promise(resolve => setTimeout(resolve, 600));
      await BlingService.createPropostaComercial(propostaData);
    } catch (propErr: any) {
      console.error('Erro ao criar proposta comercial no Bling:', propErr);
      
      let blingErrorMsg = 'Erro desconhecido ao criar proposta no Bling.';
      if (propErr.response?.data?.error?.message) {
        blingErrorMsg = propErr.response.data.error.message;
      } else if (propErr.response?.data?.error?.fields) {
        blingErrorMsg = JSON.stringify(propErr.response.data.error.fields);
      } else if (propErr.message) {
        blingErrorMsg = propErr.message;
      }

      await insertSystemErrorAction({
        error_type: 'bling_api_proposal',
        message: `Falha ao criar proposta comercial: ${blingErrorMsg}`,
        details: propErr.response?.data || propErr.message,
        protocol_id: protocolId
      });

      throw new Error(`Proposta Comercial: ${blingErrorMsg}`);
    }
    
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
