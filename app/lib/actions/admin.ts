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
    
    // 1. Create in Bling
    let blingId = null;
    try {
      const { BlingService } = await import('../services/blingService');
      const newCategory = await BlingService.createCategory({ descricao: name });
      blingId = newCategory.id;
    } catch (blingErr: any) {
      console.error('Falha ao criar categoria no Bling:', blingErr);
      throw new Error(`Falha ao sincronizar com o Bling: ${blingErr.message}`);
    }

    // 2. Create locally
    const { data, error } = await supabase.from('seal_families').insert([{ 
      name,
      bling_id: blingId 
    }]).select().single();

    if (error) throw error;

    return { success: true, data: data as SealFamily };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSealFamilyAction(id: string | number, name: string) {
  try {
    const supabase = await createClient();
    
    // Check if it has a bling_id
    const { data: family } = await supabase.from('seal_families').select('bling_id').eq('id', id).single();
    
    if (family && family.bling_id) {
      // 1. Update in Bling
      try {
        const { BlingService } = await import('../services/blingService');
        await BlingService.updateCategory(family.bling_id, { descricao: name });
      } catch (blingErr) {
        console.error(`Falha ao atualizar categoria ${family.bling_id} no Bling:`, blingErr);
        throw new Error('Falha ao sincronizar atualização de Família com o Bling.');
      }
    }

    // 2. Update locally
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

export async function syncSealFamiliesFromBlingAction() {
  try {
    const { BlingService } = await import('../services/blingService');
    const supabase = await createClient();
    
    // Fetch categories from Bling
    const blingCategories = await BlingService.getCategories();
    if (!blingCategories || !Array.isArray(blingCategories)) {
      throw new Error('Formato inválido retornado pelo Bling');
    }
    
    // Fetch local families to compare
    const { data: localFamilies } = await supabase.from('seal_families').select('*');
    const localMap = new Map((localFamilies || []).map(f => [f.bling_id, f]));
    
    let added = 0;
    let updated = 0;
    let deleted = 0;

    const blingIdsSet = new Set(blingCategories.map((c: any) => c.id).filter(Boolean));

    for (const bCat of blingCategories) {
      if (!bCat.id) continue;
      
      const existing = localMap.get(bCat.id);
      
      if (existing) {
        // Update if name changed
        if (existing.name !== bCat.descricao) {
          await supabase.from('seal_families').update({ name: bCat.descricao }).eq('id', existing.id);
          updated++;
        }
      } else {
        // Add new
        // Also check if there's a family with the exact same name but no bling_id (to link them)
        const matchByName = (localFamilies || []).find(f => f.name.toLowerCase() === bCat.descricao.toLowerCase() && !f.bling_id);
        if (matchByName) {
          await supabase.from('seal_families').update({ bling_id: bCat.id }).eq('id', matchByName.id);
          updated++;
        } else {
          await supabase.from('seal_families').insert([{ name: bCat.descricao, bling_id: bCat.id }]);
          added++;
        }
      }
    }

    // Identify and delete local families that have a bling_id but are no longer in Bling
    for (const local of (localFamilies || [])) {
      if (local.bling_id && !blingIdsSet.has(local.bling_id)) {
        // It was deleted in Bling
        const { error: delErr } = await supabase.from('seal_families').delete().eq('id', local.id);
        if (!delErr) {
          deleted++;
        } else {
          // If it fails to delete (likely due to foreign key constraints), we just unlink it from Bling
          await supabase.from('seal_families').update({ bling_id: null }).eq('id', local.id);
        }
      }
    }

    return { success: true, message: `Sincronização concluída! ${added} adicionadas, ${updated} atualizadas, ${deleted} removidas.` };
  } catch (err: any) {
    console.error('Error syncing from Bling:', err);
    return { success: false, error: err.message };
  }
}


