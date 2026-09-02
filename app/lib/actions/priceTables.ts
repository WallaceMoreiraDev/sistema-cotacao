'use server';

import { createClient } from '../supabase/server';
import { PriceTable, PriceTableItem } from '../types/database';

export async function getPriceTablesAction(): Promise<{ success: boolean; message: string; data?: PriceTable[] }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('price_tables').select('*').order('name', { ascending: true });

    if (error) {
      console.error('Error fetching price tables:', error);
      return { success: false, message: 'Erro ao buscar tabelas de preços', data: [] };
    }

    const mappedData = data.map(row => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return { success: true, message: 'Tabelas encontradas', data: mappedData as PriceTable[] };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro desconhecido' };
  }
}

export async function getPriceTableItemsAction(priceTableId: string): Promise<{ success: boolean; message: string; data?: PriceTableItem[] }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('price_table_items').select('*').eq('price_table_id', priceTableId);

    if (error) {
      console.error('Error fetching price table items:', error);
      return { success: false, message: 'Erro ao buscar itens da tabela', data: [] };
    }

    return { success: true, message: 'Itens encontrados', data };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro desconhecido' };
  }
}

export async function deletePriceTableAction(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('price_tables').delete().eq('id', id);

    if (error) {
      console.error('Error deleting price table:', error);
      return { success: false, message: 'Erro ao excluir tabela de preços' };
    }

    return { success: true, message: 'Tabela de preços excluída com sucesso' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro desconhecido' };
  }
}

export async function importPriceTableItemsAction(tableName: string, items: { sku: string; price: number }[]): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const supabase = await createClient();
    
    // 1. Get or create the price table
    let { data: tableData, error: tableError } = await supabase.from('price_tables').select('id').eq('name', tableName).single();
    let priceTableId = tableData?.id;

    if (tableError && tableError.code === 'PGRST116') {
      // Table doesn't exist, create it
      const { data: newTable, error: insertError } = await supabase.from('price_tables').insert({ name: tableName }).select('id').single();
      if (insertError) {
        throw new Error('Erro ao criar nova tabela de preços: ' + insertError.message);
      }
      priceTableId = newTable?.id;
    } else if (tableError) {
      throw new Error('Erro ao buscar tabela de preços: ' + tableError.message);
    }

    if (!priceTableId) throw new Error('Não foi possível obter o ID da tabela de preços');

    // 2. Prepare items for bulk upsert
    const itemsToUpsert = items.map(item => ({
      price_table_id: priceTableId,
      sku: item.sku,
      price: item.price
    }));

    // 3. Upsert items (conflict on price_table_id, sku)
    const { error: upsertError } = await supabase.from('price_table_items').upsert(itemsToUpsert, { onConflict: 'price_table_id,sku' });

    if (upsertError) {
      console.error('Error upserting price table items:', upsertError);
      throw new Error('Erro ao salvar os itens da tabela de preços: ' + upsertError.message);
    }

    return { success: true, message: `Foram importados/atualizados ${items.length} itens na tabela "${tableName}".` };
  } catch (err: any) {
    console.error('importPriceTableItemsAction Error:', err);
    return { success: false, message: err.message || 'Erro interno ao importar itens' };
  }
}
