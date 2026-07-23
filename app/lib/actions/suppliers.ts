'use server';

import { createClient } from '../supabase/server';
import { revalidatePath } from 'next/cache';

export interface SupplierRow {
  id: string;
  name: string;
  type: 'Mercado Local' | 'Fornecedor Original';
  created_at: string;
}

export async function getSuppliersAction() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching suppliers:', error);
      return { success: false, data: [] };
    }

    return { success: true, data: data as SupplierRow[] };
  } catch (error) {
    return { success: false, data: [] };
  }
}

export async function createSupplierAction(name: string, type: string) {
  try {
    const supabase = await createClient();
    // Generate a simple ID from name
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6);
    
    const { error } = await supabase
      .from('suppliers')
      .insert([{ id, name, type }]);

    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath('/admin/fornecedores');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSupplierAction(id: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath('/admin/fornecedores');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
