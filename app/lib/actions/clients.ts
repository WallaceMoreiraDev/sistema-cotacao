'use server';

import { createClient } from '../supabase/server';
import type { Client } from '../types/database';

/**
 * Fetch all registered clients from Supabase
 */
export async function getClientsAction(): Promise<{ success: boolean; data: Client[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching clients from Supabase:', error);
      return { success: false, data: [], error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('Exception in getClientsAction:', err);
    return { success: false, data: [], error: err?.message || 'Erro de conexão com o banco' };
  }
}

/**
 * Create a new registered client in Supabase
 */
export async function createClientAction(client: { name: string; cnpj?: string }): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: client.name.trim(),
        cnpj: client.cnpj ? client.cnpj.trim() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating client in Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Exception in createClientAction:', err);
    return { success: false, error: err?.message || 'Erro ao cadastrar cliente' };
  }
}
