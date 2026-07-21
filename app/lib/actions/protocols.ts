'use server';

import { createClient } from '../supabase/server';
import type { Protocol, ProtocolItem } from '../types/database';

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
    measurements: row.measurements || {},
    supplierPrices: row.supplier_prices || {},
    chosenSupplier: row.chosen_supplier || undefined,
    chosenSupplierType: row.chosen_supplier_type || undefined,
    markupPercent: row.markup_percent !== null && row.markup_percent !== undefined ? Number(row.markup_percent) : undefined,
    salePrice: Number(row.sale_price ?? 0),
    needsApproval: Boolean(row.needs_approval),
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
    status: protoRow.status || 'draft',
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
      status: protocol.status || 'draft',
      total_venda: totalVenda,
      draft_form: protocol.draftForm || null,
      updated_at: new Date().toISOString(),
    };

    if (!isTempId) {
      protocolPayload.id = Number(protocol.id);
    }

    console.log('[saveProtocol] Upserting protocol:', { isTempId, id: protocol.id, status: protocol.status, itemCount: protocol.items?.length ?? 0 });

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

    // 2. Delete existing items for this protocol to replace cleanly
    const { error: deleteError } = await supabase.from('protocol_items').delete().eq('protocol_id', actualId);
    if (deleteError) {
      console.error('[saveProtocol] Error deleting old items:', deleteError);
    }

    // 3. Insert new items if any exist
    if (protocol.items && protocol.items.length > 0) {
      const itemsToInsert = protocol.items.map((item) => ({
        protocol_id: actualId,
        id: crypto.randomUUID(),
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice ?? 0,
        cost_price: item.costPrice ?? 0,
        type: item.type ?? 'estoque',
        status: item.status ?? 'pendente',
        oem: item.oem || null,
        nickname: item.nickname || null,
        code: item.code || null,
        measurements: item.measurements || {},
        supplier_prices: item.supplierPrices || {},
        chosen_supplier: item.chosenSupplier || null,
        chosen_supplier_type: item.chosenSupplierType || null,
        markup_percent: item.markupPercent ?? null,
        sale_price: item.salePrice ?? 0,
        needs_approval: item.needsApproval ?? false,
      }));

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
    console.error('Exception in saveProtocolAction:', err);
    return { success: false, error: err?.message || 'Falha ao salvar protocolo no Supabase' };
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
export async function getReservedStockAction(): Promise<Record<string, number>> {
  try {
    const supabase = await createClient();

    // Active statuses that hold stock reservation
    const activeStatuses = ['in_progress', 'separating', 'in_review', 'rejected'];

    // 1. Get IDs of active protocols
    const { data: activeProtocols, error: protoError } = await supabase
      .from('protocols')
      .select('id')
      .in('status', activeStatuses);

    if (protoError || !activeProtocols || activeProtocols.length === 0) {
      return {};
    }

    const protocolIds = activeProtocols.map(p => p.id);

    // 2. Get items of these protocols
    const { data: items, error: itemsError } = await supabase
      .from('protocol_items')
      .select('code, oem, name, quantity, type')
      .in('protocol_id', protocolIds)
      .eq('type', 'estoque'); // only care about stock items

    if (itemsError || !items) {
      return {};
    }

    // 3. Sum up quantities
    // For stock mapping, we prefer 'code'. If not present, we fallback to 'oem' or 'name'.
    const reservations: Record<string, number> = {};
    for (const item of items) {
      const identifier = item.code || item.oem || item.name;
      if (!identifier) continue;
      
      reservations[identifier] = (reservations[identifier] || 0) + (Number(item.quantity) || 0);
    }

    return reservations;

  } catch (err) {
    console.error('Error fetching reserved stock:', err);
    return {};
  }
}
