'use server';

import { createClient } from '../supabase/server';
import { revalidatePath } from 'next/cache';
import type { Protocol, ProtocolItem, StockHolder } from '../types/database';

/**
 * Maps database row (snake_case) to application ProtocolItem (camelCase)
 */
function mapRowToProtocolItem(row: any): ProtocolItem {
  return {
    id: row.id,
    name: row.name,
    quantity: Number(row.quantity ?? 1),
    unitPrice: Number(row.unit_price ?? 0),
    costPrice: Number(row.cost_price ?? 0),
    type: row.type ?? 'estoque',
    status: row.status ?? 'pendente',
    oem: row.oem || undefined,
    nickname: row.nickname || undefined,
    code: row.code || undefined,
    brand: row.brand || undefined,
    measurements: row.measurements || {},
    supplierId: row.supplier_id || undefined,
    markupPercent: row.markup_percent !== null && row.markup_percent !== undefined ? Number(row.markup_percent) : undefined,
    salePrice: Number(row.sale_price ?? 0),
    needsApproval: Boolean(row.needs_approval),
    approvalStatus: row.approval_status || 'pending',
  };
}

/**
 * Maps database rows to application Protocol (camelCase)
 */
function mapRowsToProtocol(protoRow: any, itemRows: any[] = []): Protocol {
  const items = itemRows.map(mapRowToProtocolItem);
  
  // Calculate subtotal
  const subtotal = items.reduce((acc, item) => {
    const price = item.salePrice && item.salePrice > 0 ? item.salePrice : item.unitPrice * (1 + (item.markupPercent || 0) / 100);
    return acc + price * item.quantity;
  }, 0);

  return {
    id: protoRow.id,
    clientName: protoRow.client_name,
    clientCnpj: protoRow.client_cnpj || undefined,
    title: protoRow.title || undefined,
    status: protoRow.status || 'nao_reservado',
    createdAt: protoRow.created_at || new Date().toISOString(),
    updatedAt: protoRow.updated_at || new Date().toISOString(),
    draftForm: protoRow.draft_form || undefined,
    items,
    totals: {
      subtotal,
      markup: 0,
      total: Number(protoRow.total_venda ?? subtotal),
    },
  };
}

/**
 * Get all protocols with their items from Supabase
 */
export async function getProtocolsAction(): Promise<{ success: boolean; data: Protocol[]; error?: string }> {
  try {
    const supabase = await createClient();

    // Fetch protocols
    const { data: protocolsData, error: protoError } = await supabase
      .from('protocols')
      .select('*')
      .order('updated_at', { ascending: false });

    if (protoError) {
      console.error('Error fetching protocols from Supabase:', protoError);
      return { success: false, data: [], error: protoError.message };
    }

    if (!protocolsData || protocolsData.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch all items for these protocols
    const protocolIds = protocolsData.map((p) => p.id);
    const { data: itemsData, error: itemsError } = await supabase
      .from('protocol_items')
      .select('*')
      .in('protocol_id', protocolIds);

    if (itemsError) {
      console.error('Error fetching protocol items from Supabase:', itemsError);
    }

    const itemsByProtocolId: Record<string, any[]> = {};
    (itemsData || []).forEach((item) => {
      if (!itemsByProtocolId[item.protocol_id]) {
        itemsByProtocolId[item.protocol_id] = [];
      }
      itemsByProtocolId[item.protocol_id].push(item);
    });

    const result = protocolsData.map((proto) =>
      mapRowsToProtocol(proto, itemsByProtocolId[proto.id] || [])
    );

    return { success: true, data: result };
  } catch (err: any) {
    console.error('Exception in getProtocolsAction:', err);
    return { success: false, data: [], error: err?.message || 'Erro de conexão com o banco' };
  }
}

/**
 * Get a single protocol by ID with items from Supabase
 */
export async function getProtocolByIdAction(id: string): Promise<{ success: boolean; data: Protocol | null; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: protoRow, error: protoError } = await supabase
      .from('protocols')
      .select('*')
      .eq('id', id)
      .single();

    if (protoError || !protoRow) {
      return { success: false, data: null, error: protoError?.message || 'Protocolo não encontrado' };
    }

    const { data: itemsData } = await supabase
      .from('protocol_items')
      .select('*')
      .eq('protocol_id', id);

    const protocol = mapRowsToProtocol(protoRow, itemsData || []);
    return { success: true, data: protocol };
  } catch (err: any) {
    return { success: false, data: null, error: err?.message || 'Erro ao carregar protocolo' };
  }
}

/**
 * Save/Insert/Upsert a protocol and its items in Supabase
 */
export async function saveProtocolAction(protocol: Protocol, options?: { skipDiffLog?: boolean }): Promise<{ success: boolean; data?: Protocol; error?: string }> {
  try {
    const supabase = await createClient();

    // Calculate total sale price
    const totalVenda = protocol.totals?.total ?? 0;

    const isTempId = typeof protocol.id === 'string' && protocol.id.startsWith('proto-');
    const protocolPayload: any = {
      client_name: protocol.clientName,
      client_cnpj: protocol.clientCnpj || null,
      title: protocol.title || null,
      status: protocol.status || 'nao_reservado',
      total_venda: totalVenda,
      draft_form: protocol.draftForm || null,
      updated_at: new Date().toISOString(),
    };

    if (!isTempId) {
      protocolPayload.id = Number(protocol.id);
    }

    console.log('[saveProtocol] Upserting protocol:', { isTempId, id: protocol.id, status: protocol.status, itemCount: protocol.items?.length ?? 0 });

    // 0. STOCK VALIDATION (Prevent race conditions when "Efetivando")
    if (protocol.status !== 'nao_reservado' && protocol.status !== 'cancelado' && protocol.items && protocol.items.length > 0) {
      const estoqueItems = protocol.items.filter(i => i.type === 'estoque');
      if (estoqueItems.length > 0) {
        // Fetch reservations excluding this protocol
        const reservations = await getReservedStockAction(isTempId ? undefined : Number(protocol.id));
        
        // Fetch current stock from DB for the items
        const identifiers = estoqueItems.map(i => i.code || i.oem || i.name).filter(Boolean);
        const { data: stockData } = await supabase
          .from('stock_products')
          .select('sku, code, name, stock')
          .or(`code.in.(${identifiers.map(i => `"${i}"`).join(',')}),sku.in.(${identifiers.map(i => `"${i}"`).join(',')}),name.in.(${identifiers.map(i => `"${i}"`).join(',')})`);
          
        if (stockData) {
          for (const item of estoqueItems) {
            const identifier = item.code || item.oem || item.name;
            if (!identifier) continue;
            
            const product = stockData.find(p => p.code === identifier || p.sku === identifier || p.name === identifier);
            if (product) {
              const maxStock = Number(product.stock) || 0;
              const reserved = reservations[identifier]?.total || 0;
              const freeStock = maxStock - reserved;
              
              if (item.quantity > freeStock) {
                return { success: false, error: `Estoque insuficiente para o item ${item.name}. Disponível: ${freeStock}, Solicitado: ${item.quantity}. Recarregue a página para ver os estoques atualizados.` };
              }
            }
          }
        }
      }
    }

    let oldProtocolName = null;
    if (!isTempId) {
      const { data: oldData } = await supabase.from('protocols').select('client_name').eq('id', Number(protocol.id)).single();
      if (oldData) oldProtocolName = oldData.client_name;
    }

    // 1. Upsert Protocol
    const { data: protoRow, error: protoError } = await supabase
      .from('protocols')
      .upsert(protocolPayload)
      .select('id')
      .single();

    if (protoError || !protoRow) {
      console.error('[saveProtocol] Error upserting protocol:', protoError);
      return { success: false, error: protoError?.message || 'Falha ao salvar protocolo' };
    }

    const actualId = protoRow.id;
    const updatedProtocol = { ...protocol, id: actualId };

    console.log('[saveProtocol] Protocol saved with id:', actualId);

    // Fetch existing items to preserve approval state and for diffing
    const { data: existingItems } = await supabase
      .from('protocol_items')
      .select('*')
      .eq('protocol_id', actualId);

    // 2. Delete existing items for this protocol to replace cleanly
    const { error: deleteError } = await supabase.from('protocol_items').delete().eq('protocol_id', actualId);
    if (deleteError) {
      console.error('[saveProtocol] Error deleting old items:', deleteError);
    }

    // 3. Insert new items if any exist
    if (protocol.items && protocol.items.length > 0) {
      const itemsToInsert = protocol.items.map((item) => {
        // Only generate a new UUID if it's a temporary client-side ID (starts with 'item-')
        const isTempItemId = String(item.id).startsWith('item-');
        const itemId = isTempItemId ? crypto.randomUUID() : item.id;

        let finalMarkup = item.markupPercent ?? null;
        let finalSalePrice = item.salePrice ?? 0;
        let finalNeedsApproval = item.needsApproval ?? false;
        let finalApprovalStatus = item.approvalStatus || 'pending';

        if (!isTempItemId && !item.isMarkupDirty && existingItems) {
          const dbItem = existingItems.find(e => e.id === itemId);
          if (dbItem) {
            finalMarkup = dbItem.markup_percent;
            finalSalePrice = dbItem.sale_price;
            finalNeedsApproval = dbItem.needs_approval;
            finalApprovalStatus = dbItem.approval_status;
          }
        }

        return {
          protocol_id: actualId,
          id: itemId,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice ?? 0,
          cost_price: item.costPrice ?? 0,
          type: item.type ?? 'estoque',
          status: item.status ?? 'pendente',
          oem: item.oem || null,
          nickname: item.nickname || null,
          code: item.code || null,
          brand: item.brand || null,
          measurements: item.measurements || {},
          supplier_id: item.supplierId,
          markup_percent: finalMarkup,
          sale_price: finalSalePrice,
          needs_approval: finalNeedsApproval,
          approval_status: finalApprovalStatus,
        };
      });

      console.log('[saveProtocol] Inserting', itemsToInsert.length, 'items for protocol', actualId);

      const { data: insertedItems, error: itemsError } = await supabase.from('protocol_items').insert(itemsToInsert).select('id');

      if (itemsError) {
        console.error('[saveProtocol] Error inserting items:', itemsError);
        return { success: false, error: itemsError.message };
      }

      console.log('[saveProtocol] Items inserted successfully:', insertedItems?.length ?? 0);
    }
    
    // 4. Smart Diffing for Auto-Save Logging
    if (isTempId) {
      await insertLogAction(actualId, 'protocol_created', `Protocolo criado para o cliente ${protocol.clientName}.`);
    } else {
      let diffLogs = [];
      
      if (oldProtocolName && oldProtocolName !== protocol.clientName) {
        diffLogs.push(`Cliente alterado de "${oldProtocolName}" para "${protocol.clientName}".`);
      }
      
      const newItems = protocol.items || [];
      const oldItems = existingItems || [];
      
      // Group items by a base semantic key (ignoring 'type' which distinguishes Estoque/A Cotar)
      
      const buildItemDetailsString = (item: any) => {
        let details = [];
        if (item.code) details.push(`Cód: ${item.code}`);
        if (item.brand) details.push(`Marca: ${item.brand}`);
        if (item.measurements) {
          const m = item.measurements;
          const mParts = [];
          if (m.innerDiameter) mParts.push(`DI:${m.innerDiameter}`);
          if (m.outerDiameter) mParts.push(`DE:${m.outerDiameter}`);
          if (m.height1) mParts.push(`H1:${m.height1}`);
          if (m.height2) mParts.push(`H2:${m.height2}`);
          if (m.thickness) mParts.push(`Esp:${m.thickness}`);
          if (m.cs) mParts.push(`CS:${m.cs}`);
          if (mParts.length > 0) details.push(`Med: ${mParts.join('x')}`);
        }
        return details.length > 0 ? `${item.name} [${details.join(' | ')}]` : item.name;
      };

      const getBaseSemanticKey = (item: any) => {
        return buildItemDetailsString(item).toLowerCase();
      };

      type ItemStats = { name: string, estoque: number, a_cotar: number };
      const oldMap = new Map<string, ItemStats>();
      const newMap = new Map<string, ItemStats>();

      for (const item of oldItems) {
        const key = getBaseSemanticKey(item);
        if (!oldMap.has(key)) oldMap.set(key, { name: buildItemDetailsString(item), estoque: 0, a_cotar: 0 });
        const stats = oldMap.get(key)!;
        if (item.type === 'a_cotar') stats.a_cotar += Number(item.quantity);
        else stats.estoque += Number(item.quantity);
      }

      for (const item of newItems) {
        const key = getBaseSemanticKey(item);
        if (!newMap.has(key)) newMap.set(key, { name: buildItemDetailsString(item), estoque: 0, a_cotar: 0 });
        const stats = newMap.get(key)!;
        if (item.type === 'a_cotar') stats.a_cotar += Number(item.quantity);
        else stats.estoque += Number(item.quantity);
      }

      const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);

      for (const key of allKeys) {
        const oldStats = oldMap.get(key) || { name: '', estoque: 0, a_cotar: 0 };
        const newStats = newMap.get(key) || { name: '', estoque: 0, a_cotar: 0 };
        
        const oldTotal = oldStats.estoque + oldStats.a_cotar;
        const newTotal = newStats.estoque + newStats.a_cotar;
        
        const deltaEstoque = newStats.estoque - oldStats.estoque;
        const deltaCotar = newStats.a_cotar - oldStats.a_cotar;
        
        const itemName = newStats.name || oldStats.name;

        if (oldTotal === 0 && newTotal > 0) {
          // Pure addition
          if (newStats.estoque > 0 && newStats.a_cotar > 0) {
             diffLogs.push(`Item adicionado e fracionado: "${itemName}" (${newStats.estoque} un. em Estoque + ${newStats.a_cotar} un. A Cotar)`);
          } else if (newStats.estoque > 0) {
             diffLogs.push(`Item adicionado (Estoque): "${itemName}" (${newStats.estoque} un.)`);
          } else {
             diffLogs.push(`Item adicionado (A Cotar): "${itemName}" (${newStats.a_cotar} un.)`);
          }
        } else if (oldTotal > 0 && newTotal === 0) {
          // Pure removal
          if (oldStats.estoque > 0 && oldStats.a_cotar > 0) {
            diffLogs.push(`Item totalmente removido: "${itemName}" (removido do Estoque e de A Cotar)`);
          } else if (oldStats.estoque > 0) {
            diffLogs.push(`Item removido (Estoque): "${itemName}"`);
          } else {
            diffLogs.push(`Item removido (A Cotar): "${itemName}"`);
          }
        } else if (oldTotal > 0 && newTotal > 0) {
          // Mixed changes or reallocation
          
          // Detect pure reallocation
          if (deltaEstoque > 0 && deltaCotar < 0 && Math.abs(deltaEstoque) === Math.abs(deltaCotar)) {
             diffLogs.push(`Item "${itemName}" remanejado: ${deltaEstoque} un. de A Cotar para Estoque.`);
          } else if (deltaCotar > 0 && deltaEstoque < 0 && Math.abs(deltaEstoque) === Math.abs(deltaCotar)) {
             diffLogs.push(`Item "${itemName}" remanejado: ${deltaCotar} un. de Estoque para A Cotar.`);
          } else {
             // Independent changes
             if (deltaEstoque !== 0) {
               if (oldStats.estoque === 0 && deltaEstoque > 0) {
                 diffLogs.push(`Item adicionado (Estoque): "${itemName}" (${deltaEstoque} un.)`);
               } else if (newStats.estoque === 0 && deltaEstoque < 0) {
                 diffLogs.push(`Item removido do Estoque: "${itemName}"`);
               } else {
                 diffLogs.push(`Quantidade de "${itemName}" (Estoque) alterada: de ${oldStats.estoque} para ${newStats.estoque} un.`);
               }
             }
             if (deltaCotar !== 0) {
               if (oldStats.a_cotar === 0 && deltaCotar > 0) {
                 diffLogs.push(`Item adicionado (A Cotar): "${itemName}" (${deltaCotar} un.)`);
               } else if (newStats.a_cotar === 0 && deltaCotar < 0) {
                 diffLogs.push(`Item removido de A Cotar: "${itemName}"`);
               } else {
                 diffLogs.push(`Quantidade de "${itemName}" (A Cotar) alterada: de ${oldStats.a_cotar} para ${newStats.a_cotar} un.`);
               }
             }
          }
        }
      }
      
      if (!options?.skipDiffLog && diffLogs.length > 0) {
        await insertLogAction(actualId, 'auto_save_diff', `Alterações no protocolo:\n${diffLogs.map(l => '- ' + l).join('\n')}`, {
          snapshot: {
            oldClientName: oldProtocolName,
            newClientName: protocol.clientName,
            oldItems: oldItems,
            newItems: newItems,
          }
        });
      }
    }

    return { success: true, data: updatedProtocol };
  } catch (err: any) {
    console.error('[saveProtocol] Exception:', err);
    return { success: false, error: err?.message || 'Erro inesperado ao salvar protocolo' };
  }
}

/**
 * Reservar Estoque Action
 * Changes protocol status to 'reservado' and all unreserved stock items to 'reservado'
 */
export async function reservarEstoqueAction(protocolId: string | number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Validate Stock before reserving
    const { data: items } = await supabase
      .from('protocol_items')
      .select('*')
      .eq('protocol_id', Number(protocolId))
      .eq('type', 'estoque');

    if (items && items.length > 0) {
      const reservations = await getReservedStockAction(Number(protocolId));
      const identifiers = items.map(i => i.code || i.oem || i.name).filter(Boolean);
      
      if (identifiers.length > 0) {
        const { data: stockData } = await supabase
          .from('stock_products')
          .select('sku, code, name, stock')
          .or(`code.in.(${identifiers.map(i => `"${i}"`).join(',')}),sku.in.(${identifiers.map(i => `"${i}"`).join(',')}),name.in.(${identifiers.map(i => `"${i}"`).join(',')})`);
          
        if (stockData) {
          for (const item of items) {
            const identifier = item.code || item.oem || item.name;
            if (!identifier) continue;
            
            const product = stockData.find(p => p.code === identifier || p.sku === identifier || p.name === identifier);
            if (product) {
              const maxStock = Number(product.stock) || 0;
              const reserved = reservations[identifier]?.total || 0;
              const freeStock = maxStock - reserved;
              
              if (Number(item.quantity) > freeStock) {
                return { success: false, error: `Estoque insuficiente para o item ${item.name}. Disponível: ${freeStock}, Solicitado: ${item.quantity}. Recarregue a página.` };
              }
            }
          }
        }
      }
    }
    
    // Update protocol status
    const { error: protoError } = await supabase
      .from('protocols')
      .update({ status: 'reservado', updated_at: new Date().toISOString() })
      .eq('id', Number(protocolId));
      
    if (protoError) throw protoError;

    // Update stock items to 'reservado'
    const { error: itemsError } = await supabase
      .from('protocol_items')
      .update({ status: 'reservado' })
      .eq('protocol_id', Number(protocolId))
      .eq('type', 'estoque');

    if (itemsError) throw itemsError;

    await insertLogAction(protocolId, 'status_change', 'Protocolo movido para Reservado / Aguardando Estoque.');

    return { success: true };
  } catch (err: any) {
    console.error('[reservarEstoque] Exception:', err);
    return { success: false, error: err?.message || 'Falha ao reservar estoque.' };
  }
}

/**
 * Enviar para Bling Action
 * Completes the protocol (status 'finalizado'). Note: validation of items must be done on the client or before this call.
 */
export async function enviarParaBlingAction(protocolId: string | number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error: protoError } = await supabase
      .from('protocols')
      .update({ status: 'finalizado', updated_at: new Date().toISOString() })
      .eq('id', Number(protocolId));
      
    if (protoError) throw protoError;
    
    // We could add integration logic to Bling here later
    
    await insertLogAction(protocolId, 'status_change', 'Protocolo Efetivado no Bling (Finalizado).');

    return { success: true };
  } catch (err: any) {
    console.error('[enviarParaBling] Exception:', err);
    return { success: false, error: err?.message || 'Falha ao enviar para o Bling.' };
  }
}

/**
 * Cancelar Cotação Action
 * Changes protocol status to 'cancelado' and un-reserves stock items
 */
export async function cancelarCotacaoAction(protocolId: string | number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error: protoError } = await supabase
      .from('protocols')
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', Number(protocolId));
      
    if (protoError) throw protoError;

    // Un-reserve items so they go back to the pool
    const { error: itemsError } = await supabase
      .from('protocol_items')
      .update({ status: 'pendente' })
      .eq('protocol_id', Number(protocolId))
      .eq('status', 'reservado');
      
    if (itemsError) console.error('Failed to un-reserve items during cancellation:', itemsError);
    
    await insertLogAction(protocolId, 'status_change', 'Protocolo Cancelado.');

    return { success: true };
  } catch (err: any) {
    console.error('[cancelarCotacao] Exception:', err);
    return { success: false, error: err?.message || 'Falha ao cancelar cotação.' };
  }
}

/**
 * Estornar Cotação Action
 * Changes a finished protocol back to 'reservado' (items keep their status)
 */
export async function estornarCotacaoAction(protocolId: string | number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error: protoError } = await supabase
      .from('protocols')
      .update({ status: 'reservado', updated_at: new Date().toISOString() })
      .eq('id', Number(protocolId));
      
    if (protoError) throw protoError;

    await insertLogAction(protocolId, 'status_change', 'Protocolo Estornado (Voltou para Reserva).');

    return { success: true };
  } catch (err: any) {
    console.error('[estornarCotacao] Exception:', err);
    return { success: false, error: err?.message || 'Falha ao estornar cotação.' };
  }
}

/**
 * Restaurar Cotação Action
 * Changes a cancelled protocol back to 'nao_reservado'
 */
export async function restaurarCotacaoAction(protocolId: string | number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error: protoError } = await supabase
      .from('protocols')
      .update({ status: 'nao_reservado', updated_at: new Date().toISOString() })
      .eq('id', Number(protocolId));
      
    if (protoError) throw protoError;
    
    await insertLogAction(protocolId, 'status_change', 'Protocolo Restaurado (Voltou para Rascunho).');

    return { success: true };
  } catch (err: any) {
    console.error('[restaurarCotacao] Exception:', err);
    return { success: false, error: err?.message || 'Falha ao restaurar cotação.' };
  }
}

/**
 * Update protocol status (used when dragging cards in Kanban)
 */
export async function updateProtocolStatusAction(
  id: string,
  status: Protocol['status']
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('protocols')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating protocol status in Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao atualizar status' };
  }
}

/**
 * Delete protocol by ID
 */
export async function deleteProtocolAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('protocols').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao excluir protocolo' };
  }
}

/**
 * Gets a map of product code -> total reserved quantity across active protocols.
 * Active protocols are those that are not 'draft' (Rascunho) and not 'approved' (Finalizado).
 */
export async function getReservedStockAction(excludeProtocolId?: number): Promise<Record<string, { total: number; heldBy: StockHolder[] }>> {
  try {
    const supabase = await createClient();

    // Active statuses that hold stock reservation
    const activeStatuses = ['reservado', 'finalizado'];

    // 1. Get IDs of active protocols
    const { data: activeProtocols, error: protoError } = await supabase
      .from('protocols')
      .select('id')
      .in('status', activeStatuses);

    if (protoError || !activeProtocols || activeProtocols.length === 0) {
      return {};
    }

    const protocolIds = activeProtocols.map(p => p.id);

    // 2. Get items of these protocols WITH protocol details
    let query = supabase
      .from('protocol_items')
      .select('code, oem, name, quantity, type, protocol_id, protocols ( id, client_name, title )')
      .in('protocol_id', protocolIds)
      .eq('type', 'estoque'); // only care about stock items

    if (excludeProtocolId) {
      query = query.neq('protocol_id', excludeProtocolId);
    }

    const { data: items, error: itemsError } = await query;

    if (itemsError || !items) {
      return {};
    }

    // 3. Sum up quantities and map holders
    // For stock mapping, we prefer 'code'. If not present, we fallback to 'oem' or 'name'.
    const reservations: Record<string, { total: number; heldBy: StockHolder[] }> = {};
    for (const item of items) {
      const identifier = item.code || item.oem || item.name;
      if (!identifier) continue;
      
      const qty = Number(item.quantity) || 0;
      
      if (!reservations[identifier]) {
        reservations[identifier] = { total: 0, heldBy: [] };
      }
      
      reservations[identifier].total += qty;
      
      const p = Array.isArray(item.protocols) ? item.protocols[0] : item.protocols;
      
      reservations[identifier].heldBy.push({
        protocolId: p?.id || item.protocol_id,
        clientName: p?.client_name || 'Desconhecido',
        title: p?.title || '',
        quantity: qty
      });
    }

    return reservations;

  } catch (err) {
    console.error('Error fetching reserved stock:', err);
    return {};
  }
}

export async function getPendingApprovalsAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('protocol_items')
    .select(`
      *,
      protocols!inner(id, client_name, title, status)
    `)
    .eq('needs_approval', true)
    .eq('approval_status', 'pending')
    .neq('protocols.status', 'cancelado')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending approvals:', error);
    return { success: false, error: error.message };
  }
  
  // Format the data a bit for the frontend
  const formattedData = data.map((item: any) => ({
    ...mapRowToProtocolItem(item),
    protocol: Array.isArray(item.protocols) ? item.protocols[0] : item.protocols
  }));

  return { success: true, data: formattedData };
}

export async function approveItemAction(itemId: string) {
  const supabase = await createClient();
  const { data: itemData, error: itemError } = await supabase.from('protocol_items').select('protocol_id, name, markup_percent').eq('id', itemId).single();
  if (itemError) return { success: false, error: itemError.message };

  const { error } = await supabase
    .from('protocol_items')
    .update({ approval_status: 'approved' })
    .eq('id', itemId);

  if (error) {
    console.error('Error approving item:', error);
    return { success: false, error: error.message };
  }
  
  await insertLogAction(itemData.protocol_id, 'markup_approved', `Markup de ${itemData.markup_percent}% aprovado para o item ${itemData.name}.`);

  revalidatePath('/admin/aprovacoes');
  revalidatePath('/protocolo/[id]', 'page');
  return { success: true };
}

export async function approveWithCustomMarkupAction(itemId: string, customMarkup: number, basePrice: number) {
  console.log('approveWithCustomMarkupAction called with:', { itemId, customMarkup, basePrice });
  const supabase = await createClient();
  const { data: itemData, error: itemError } = await supabase.from('protocol_items').select('protocol_id, name').eq('id', itemId).single();
  if (itemError) return { success: false, error: itemError.message };

  const salePrice = basePrice * (1 + customMarkup / 100);
  console.log('calculated salePrice:', salePrice);
  
  const { error } = await supabase
    .from('protocol_items')
    .update({ 
      approval_status: 'approved',
      markup_percent: customMarkup,
      sale_price: salePrice,
      needs_approval: true 
    })
    .eq('id', itemId);

  if (error) {
    console.error('Error approving item with custom markup:', error);
    return { success: false, error: error.message };
  }
  console.log('update successful for item:', itemId);
  
  await insertLogAction(itemData.protocol_id, 'markup_approved', `Markup de ${customMarkup}% aprovado (modificado) para o item ${itemData.name}.`);

  revalidatePath('/admin/aprovacoes');
  revalidatePath('/protocolo/[id]', 'page');
  return { success: true };
}

export async function rejectItemAction(itemId: string, defaultMarkup: number, basePrice: number) {
  const supabase = await createClient();
  const { data: itemData, error: itemError } = await supabase.from('protocol_items').select('protocol_id, name, markup_percent').eq('id', itemId).single();
  if (itemError) return { success: false, error: itemError.message };
  
  const { error } = await supabase
    .from('protocol_items')
    .update({ 
      approval_status: 'rejected',
      needs_approval: false
    })
    .eq('id', itemId);

  if (error) {
    console.error('Error rejecting item:', error);
    return { success: false, error: error.message };
  }
  
  await insertLogAction(itemData.protocol_id, 'markup_rejected', `Markup de ${itemData.markup_percent}% rejeitado para o item ${itemData.name}.`);

  revalidatePath('/admin/aprovacoes');
  revalidatePath('/protocolo/[id]', 'page');
  return { success: true };
}

export async function insertLogAction(protocolId: string | number, actionType: string, description: string, metadata?: any) {
  try {
    const supabase = await createClient();
    const numericProtocolId = typeof protocolId === 'string' ? parseInt(protocolId.replace(/\D/g, ''), 10) : protocolId;
    
    // We will hardcode a mock user for now as auth is phase 2
    // If the action is approval/rejection, it's admin. Otherwise, it's a seller.
    const isAdminAction = ['markup_approved', 'markup_rejected'].includes(actionType);
    
    const { error } = await supabase.from('protocol_logs').insert({
      protocol_id: numericProtocolId,
      action_type: actionType,
      description,
      metadata: metadata || {},
      user_name: isAdminAction ? 'Admin' : 'Vendedor',
      user_role: isAdminAction ? 'Gerente' : 'Vendedor Externo',
      user_sector: isAdminAction ? 'Diretoria' : 'Comercial'
    });

    if (error) {
      console.error('Error inserting protocol log:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error in insertLogAction:', err);
    return { success: false, error: err.message };
  }
}

export async function getProtocolLogsAction(protocolId: string | number) {
  try {
    const supabase = await createClient();
    const numericProtocolId = typeof protocolId === 'string' ? parseInt(protocolId.replace(/\D/g, ''), 10) : protocolId;
    
      const { data, error } = await supabase
        .from('protocol_logs')
        .select('*')
        .eq('protocol_id', numericProtocolId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      if (error) {
      console.error('Error fetching protocol logs:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error('Error in getProtocolLogsAction:', err);
    return { success: false, error: err.message };
  }
}
