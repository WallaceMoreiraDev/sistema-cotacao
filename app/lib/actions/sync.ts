'use server';

import { createClient } from '../supabase/server';
import { BlingService } from '../services/blingService';
import { extractMeasurementsFromName, extractPartTypeFromName, extractCodesFromName, extractBrandFromName, extractCategoryFromName } from '../utils/measurementParser';
import type { SealFamily, StockProduct } from '../types/database';

export async function syncBlingCategoriesAction() {
  try {
    const categories = await BlingService.getAllCategories();
    if (!categories || categories.length === 0) {
      return { success: true, message: 'Nenhuma categoria encontrada no Bling.' };
    }

    const supabase = await createClient();

    let createdCount = 0;
    let updatedCount = 0;

    for (const cat of categories) {
      const blingId = cat.id;
      const name = cat.descricao; // Bling returns description for category name

      // Try to upsert based on bling_id
      const { data: existing } = await supabase.from('seal_families').select('id').eq('bling_id', blingId).single();

      if (existing) {
        const { error } = await supabase.from('seal_families').update({ name }).eq('bling_id', blingId);
        if (!error) updatedCount++;
      } else {
        // If there's no matching bling_id, try to match by name (incase they created it manually first)
        const { data: existingByName } = await supabase.from('seal_families').select('id').eq('name', name).single();
        if (existingByName) {
          const { error } = await supabase.from('seal_families').update({ bling_id: blingId }).eq('id', existingByName.id);
          if (!error) updatedCount++;
        } else {
          const { error } = await supabase.from('seal_families').insert([{ name, bling_id: blingId }]);
          if (!error) createdCount++;
        }
      }
    }

    return { success: true, message: `Sincronização concluída. ${createdCount} criadas, ${updatedCount} atualizadas.` };
  } catch (err: any) {
    console.error('syncBlingCategoriesAction error:', err);
    return { success: false, error: err.message };
  }
}

export async function syncBlingProductsAction() {
  try {
    // For now we just fetch them. In Phase 4 we will parse them.
    const products = await BlingService.getAllProducts();
    if (!products || products.length === 0) {
      return { success: true, message: 'Nenhum produto encontrado no Bling.' };
    }

    const supabase = await createClient();
    let createdCount = 0;
    let updatedCount = 0;

    // Fetch existing seal families to map category names
    const { data: families } = await supabase.from('seal_families').select('name, bling_id');
    const familyMap = new Map();
    if (families) {
      families.forEach(f => {
        if (f.bling_id) familyMap.set(f.bling_id.toString(), f.name);
      });
    }

    // Buscar IDs existentes para mapeamento (lidando com paginação do Supabase que corta no 1000)
    let allExistingData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const { data } = await supabase.from('stock_products').select('id, bling_id').not('bling_id', 'is', null).range(page * pageSize, (page + 1) * pageSize - 1);
      if (!data || data.length === 0) break;
      allExistingData = allExistingData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }

    const existingMap = new Map();
    allExistingData.forEach(e => existingMap.set(e.bling_id.toString(), e.id));

    const upsertBatch = [];

    for (const prod of products) {
      const blingId = prod.id.toString();
      const name = prod.nome;
      const code = prod.codigo; // SKU in Bling
      const price = parseFloat(prod.preco || '0');

      const measurements = extractMeasurementsFromName(name);
      const partType = extractPartTypeFromName(name);
      const codes = extractCodesFromName(name);
      const brand = extractBrandFromName(name);
      
      const blingCatId = prod.categoria?.id?.toString();
      let categoryName = (blingCatId && familyMap.get(blingCatId)) || 'Desconhecida';
      
      // Fallback: se for Desconhecida, tenta inferir pelo nome
      if (categoryName === 'Desconhecida') {
        categoryName = extractCategoryFromName(name);
      }

      const payload: any = {
        name,
        sku: code,
        code,
        cost_price: price,
        bling_id: blingId,
        category: categoryName,
        part_type: partType || null,
        measurements: measurements || {},
        oem_code: codes.oem_code || null,
        parker_code: codes.parker_code || null,
        supplier_code: codes.supplier_code || null,
        brand: brand || null,
        updated_at: new Date().toISOString()
      };

      const existingId = existingMap.get(blingId);
      if (existingId) {
        payload.id = existingId;
        updatedCount++;
      } else {
        payload.id = `prod_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        payload.created_at = new Date().toISOString();
        createdCount++;
      }
      upsertBatch.push(payload);
    }

    // Upsert in chunks of 1000 to avoid request size limits
    const chunkSize = 1000;
    for (let i = 0; i < upsertBatch.length; i += chunkSize) {
      const chunk = upsertBatch.slice(i, i + chunkSize);
      const { error } = await supabase.from('stock_products').upsert(chunk, { onConflict: 'id' });
      if (error) console.error('Error during bulk upsert:', error);
    }

    // Grava log de importação
    await supabase.from('import_logs').insert([{
      original_name: 'Sincronização Manual Completa',
      reason: `Criados: ${createdCount}, Atualizados: ${updatedCount}`
    }]);

    return { success: true, message: `Produtos sincronizados. ${createdCount} novos, ${updatedCount} atualizados.` };
  } catch (err: any) {
    console.error('syncBlingProductsAction error:', err);
    return { success: false, error: err.message };
  }
}

export async function syncBlingStockAction() {
  try {
    const supabase = await createClient();

    // Fetch all existing stock_products with pagination to avoid the 1000 rows limit
    let allExistingData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const { data } = await supabase.from('stock_products').select('*').not('bling_id', 'is', null).range(page * pageSize, (page + 1) * pageSize - 1);
      if (!data || data.length === 0) break;
      allExistingData = allExistingData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }

    if (allExistingData.length === 0) {
      return { success: true, message: 'Nenhum produto sincronizado no banco de dados para buscar estoque.' };
    }

    const existingMap = new Map();
    const blingIds: string[] = [];
    allExistingData.forEach(e => {
      existingMap.set(e.bling_id.toString(), e);
      blingIds.push(e.bling_id.toString());
    });

    let updatedCount = 0;
    const upsertBatch = [];

    // Fetch stock in chunks of 50 to avoid URL too long / rate limits
    const chunkSize = 50;
    for (let i = 0; i < blingIds.length; i += chunkSize) {
      const chunkIds = blingIds.slice(i, i + chunkSize);

      const balances = await BlingService.getStockBalancesForProducts(chunkIds);

      for (const bal of balances) {
        const blingProductId = bal.produto?.id?.toString();
        const totalStock = bal.saldoFisicoTotal || 0;

        if (blingProductId) {
          const existingRow = existingMap.get(blingProductId);
          if (existingRow) {
            upsertBatch.push({
              ...existingRow,
              stock: totalStock
            });
            updatedCount++;
          }
        }
      }

      // Sleep slightly to respect Bling limits
      await new Promise(res => setTimeout(res, 333));
    }

    if (upsertBatch.length > 0) {
      // Chunk upserts to DB
      const dbChunkSize = 1000;
      for (let i = 0; i < upsertBatch.length; i += dbChunkSize) {
        const dbChunk = upsertBatch.slice(i, i + dbChunkSize);
        const { error } = await supabase.from('stock_products').upsert(dbChunk, { onConflict: 'id' });
        if (error) console.error('Error during bulk stock upsert:', error);
      }
    }

    await supabase.from('import_logs').insert([{
      original_name: 'Sincronização de Saldos',
      reason: `Atualizados: ${updatedCount} produtos com saldo físico`
    }]);

    return { success: true, message: `Estoque sincronizado. ${updatedCount} itens atualizados com saldo real.` };
  } catch (err: any) {
    console.error('syncBlingStockAction error:', err);
    return { success: false, error: err.message };
  }
}
