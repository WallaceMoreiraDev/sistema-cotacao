'use server';

import { createClient } from '../supabase/server';

export async function getSealFamiliesAction() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('seal_families')
      .select('*')
      .order('name');
      
    if (error) {
      console.error('Error fetching seal families:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in getSealFamiliesAction:', error);
    return { success: false, error: error.message };
  }
}
