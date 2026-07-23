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
    supplierPrices: row.supplier_prices || {},
    chosenSupplier: row.chosen_supplier || undefined,
    chosenSupplierType: row.chosen_supplier_type || undefined,
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
export async function saveProtocolAction(protocol: Protocol): Promise<{ success: boolean; data?: Protocol; error?: string }> {
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

    // Fetch existing items to preserve approval state if not explicitly dirtied on the frontend
    const { data: existingItems } = await supabase
      .from('protocol_items')
      .select('id, markup_percent, sale_price, needs_approval, approval_status')
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
          supplier_prices: item.supplierPrices || {},
          chosen_supplier: item.chosenSupplier || null,
          chosen_supplier_type: item.chosenSupplierType || null,
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
  const { error } = await supabase
    .from('protocol_items')
    .update({ approval_status: 'approved' })
    .eq('id', itemId);

  if (error) {
    console.error('Error approving item:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/admin/aprovacoes');
  revalidatePath('/protocolo/[id]', 'page');
  return { success: true };
}

export async function approveWithCustomMarkupAction(itemId: string, customMarkup: number, basePrice: number) {
  console.log('approveWithCustomMarkupAction called with:', { itemId, customMarkup, basePrice });
  const supabase = await createClient();
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
  
  revalidatePath('/admin/aprovacoes');
  revalidatePath('/protocolo/[id]', 'page');
  return { success: true };
}

export async function rejectItemAction(itemId: string, defaultMarkup: number, basePrice: number) {
  const supabase = await createClient();
  
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
  
  revalidatePath('/admin/aprovacoes');
  revalidatePath('/protocolo/[id]', 'page');
  return { success: true };
}
