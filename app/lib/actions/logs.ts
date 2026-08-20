'use server';

import { createClient } from '../supabase/server';

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
