'use server';

import { createClient } from '../supabase/server';
import type { SealType } from '../types/database';

/**
 * Fetch all registered seal types from Supabase
 */
export async function getSealTypesAction(): Promise<{ success: boolean; data: SealType[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('seal_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching seal types from Supabase:', error);
      return { success: false, data: [], error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('Exception in getSealTypesAction:', err);
    return { success: false, data: [], error: err?.message || 'Erro de conexão com o banco' };
  }
}
