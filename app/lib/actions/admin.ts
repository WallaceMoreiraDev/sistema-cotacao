'use server';

import { createClient } from '../supabase/server';
import { SystemSettings, Supplier, SealType, SealFamily } from '../types/database';

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

// ─── Seal Types (Tipos de Vedações) ───
export async function getSealTypesAction() {
  try {
    const supabase = await createClient();
    // Using Supabase left join syntax to get the family object
    const { data, error } = await supabase
      .from('seal_types')
      .select('*, family:seal_families(*)')
      .order('name');

    if (error) throw error;

    return {
      success: true, data: data.map((d: any) => ({
        ...d,
        requiredMeasurements: d.required_measurements || []
      })) as SealType[]
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createSealTypeAction(sealType: Omit<SealType, 'id' | 'family'>) {
  try {
    const supabase = await createClient();
    const payload = {
      name: sealType.name,
      family_id: sealType.family_id,
      required_measurements: sealType.requiredMeasurements || []
    };

    const { data, error } = await supabase
      .from('seal_types')
      .insert([payload])
      .select('*, family:seal_families(*)')
      .single();

    if (error) throw error;

    const created = {
      ...data,
      requiredMeasurements: data.required_measurements || []
    };

    return { success: true, data: created as SealType };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSealTypeAction(id: string | number, sealType: Partial<Omit<SealType, 'id' | 'family'>>) {
  try {
    const supabase = await createClient();

    const payload: any = {};
    if (sealType.name !== undefined) payload.name = sealType.name;
    if (sealType.family_id !== undefined) payload.family_id = sealType.family_id;
    if (sealType.requiredMeasurements !== undefined) payload.required_measurements = sealType.requiredMeasurements;

    const { data, error } = await supabase
      .from('seal_types')
      .update(payload)
      .eq('id', id)
      .select('*, family:seal_families(*)')
      .single();

    if (error) throw error;

    return { success: true, data: { ...data, requiredMeasurements: data.required_measurements || [] } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteSealTypeAction(id: string | number) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('seal_types').delete().eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
