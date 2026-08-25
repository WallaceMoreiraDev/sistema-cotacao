'use server';

import { createClient } from '../supabase/server';

export async function insertLogAction(protocolId: string | number, actionType: string, description: string, metadata?: any) {
  try {
    const supabase = await createClient();
    const numericProtocolId = typeof protocolId === 'string' ? parseInt(protocolId.replace(/\D/g, ''), 10) : protocolId;
    
    // Fallback if no user is found (e.g. cron jobs or webhooks)
    let userName = 'Sistema';
    let userRole = 'Automático';
    let userSector = 'Backend';

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name, role, job_title, department').eq('id', user.id).single();
      if (profile) {
        userName = profile.full_name || 'Usuário Desconhecido';
        userRole = profile.job_title || profile.role || 'Membro';
        userSector = profile.department || 'Geral';
      }
    } else {
      const isAdminAction = ['markup_approved', 'markup_rejected'].includes(actionType);
      if (isAdminAction) {
        userName = 'Admin (Fallback)';
        userRole = 'Gerente';
        userSector = 'Diretoria';
      }
    }
    
    const { error } = await supabase.from('protocol_logs').insert({
      protocol_id: numericProtocolId,
      action_type: actionType,
      description,
      metadata: metadata || {},
      user_name: userName,
      user_role: userRole,
      user_sector: userSector
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
