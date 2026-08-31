'use server';

import { createClient } from '../supabase/server';

export interface SystemErrorLog {
  id?: number;
  created_at?: string;
  error_type: string;
  message: string;
  details?: any;
  protocol_id?: number | string | null;
}

export async function insertSystemErrorAction(errorLog: SystemErrorLog) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('system_errors')
      .insert({
        error_type: errorLog.error_type,
        message: errorLog.message,
        details: errorLog.details,
        protocol_id: errorLog.protocol_id ? Number(errorLog.protocol_id) : null
      });

    if (error) {
      console.error('[insertSystemErrorAction] Error writing to system_errors:', error);
    }
  } catch (e) {
    console.error('[insertSystemErrorAction] Exception:', e);
  }
}

export async function getSystemErrorsAction(limit: number = 100) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, data: [], error: 'Não autenticado' };
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role?.toLowerCase() !== 'admin') {
       return { success: false, data: [], error: 'Sem permissão' };
    }

    const { data, error } = await supabase
      .from('system_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data };
  } catch (e: any) {
    console.error('[getSystemErrorsAction] Exception:', e);
    return { success: false, data: [], error: e.message };
  }
}
