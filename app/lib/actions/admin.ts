'use server';

import { createClient } from '../supabase/server';
import { SystemSettings, Supplier, SealFamily } from '../types/database';

export async function getSystemSettingsAction() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('system_settings').select('*');

    if (error) {
      console.error('Error fetching system settings:', error);
      return { success: false, error: error.message };
    }

    const settings: SystemSettings = {
      markup_original: 70,
      markup_local: 30,
    };

    if (data) {
      data.forEach((row) => {
        if (row.key === 'markup_original') settings.markup_original = Number(row.value);
        if (row.key === 'markup_local') settings.markup_local = Number(row.value);
        if (row.key === 'bling_client_id') settings.bling_client_id = String(row.value).replace(/^"(.*)"$/, '$1');
        if (row.key === 'bling_client_secret') settings.bling_client_secret = String(row.value).replace(/^"(.*)"$/, '$1');
        if (row.key === 'bling_access_token') settings.bling_access_token = String(row.value).replace(/^"(.*)"$/, '$1');
        if (row.key === 'bling_refresh_token') settings.bling_refresh_token = String(row.value).replace(/^"(.*)"$/, '$1');
        if (row.key === 'bling_token_expires_at') settings.bling_token_expires_at = String(row.value).replace(/^"(.*)"$/, '$1');
      });
    }

    return { success: true, data: settings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSystemSettingsAction(settings: SystemSettings) {
  try {
    const supabase = await createClient();

    const updates = [
      { key: 'markup_original', value: settings.markup_original.toString() },
      { key: 'markup_local', value: settings.markup_local.toString() }
    ];

    if (settings.bling_client_id !== undefined) updates.push({ key: 'bling_client_id', value: `"${settings.bling_client_id}"` });
    if (settings.bling_client_secret !== undefined) updates.push({ key: 'bling_client_secret', value: `"${settings.bling_client_secret}"` });
    if (settings.bling_access_token !== undefined) updates.push({ key: 'bling_access_token', value: `"${settings.bling_access_token}"` });
    if (settings.bling_refresh_token !== undefined) updates.push({ key: 'bling_refresh_token', value: `"${settings.bling_refresh_token}"` });
    if (settings.bling_token_expires_at !== undefined) updates.push({ key: 'bling_token_expires_at', value: `"${settings.bling_token_expires_at}"` });

    for (const update of updates) {
      const { error } = await supabase.from('system_settings').upsert(update, { onConflict: 'key' });
      if (error) throw error;
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getSuppliersAction() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('suppliers').select('*').order('name');

    if (error) throw error;

    return { success: true, data: data as Supplier[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createSupplierAction(supplier: Partial<Supplier>) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('suppliers').insert([{
      name: supplier.name,
      type: supplier.type
    }]).select().single();

    if (error) throw error;

    return { success: true, data: data as Supplier };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSupplierAction(id: number | string, supplier: Partial<Supplier>) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('suppliers').update({
      name: supplier.name,
      type: supplier.type
    }).eq('id', id).select().single();

    if (error) throw error;

    return { success: true, data: data as Supplier };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteSupplierAction(id: string | number) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('suppliers').delete().eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Seal Families (Famílias de Vedações) ───
export async function getSealFamiliesAction() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('seal_families').select('*').order('name');

    if (error) throw error;

    return { success: true, data: data as SealFamily[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createSealFamilyAction(name: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('seal_families').insert([{ name }]).select().single();

    if (error) throw error;

    return { success: true, data: data as SealFamily };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSealFamilyAction(id: string | number, name: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('seal_families').update({ name }).eq('id', id).select().single();

    if (error) throw error;

    return { success: true, data: data as SealFamily };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteSealFamilyAction(id: string | number) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('seal_families').delete().eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


