'use server';

import { createClient } from '../supabase/server';
import { revalidatePath } from 'next/cache';
import { insertLogAction } from './logs';
import type { ProtocolItem } from '../types/database';

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
