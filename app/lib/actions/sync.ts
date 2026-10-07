'use server';

import { createClient } from '../supabase/server';
import { BlingService } from '../services/blingService';
import { extractMeasurementsFromName, extractPartTypeFromName, extractCodesFromName, extractBrandFromName, extractCategoryFromName } from '../utils/measurementParser';

export async function syncBlingCategoriesPageAction(page: number = 1) {
  try {
    const { data: categories, hasMore } = await BlingService.getCategoriesPage(page);
    if (!categories || categories.length === 0) {
      return { success: true, message: 'Nenhuma categoria encontrada.', hasMore: false };
    }

    const supabase = await createClient();
    let createdCount = 0;
    let updatedCount = 0;

    for (const cat of categories) {
      const blingId = cat.id;
      const name = cat.descricao;

      const { data: existing } = await supabase.from('seal_families').select('id').eq('bling_id', blingId).single();

      if (existing) {
        const { error } = await supabase.from('seal_families').update({ name }).eq('bling_id', blingId);
        if (!error) updatedCount++;
      } else {
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

    return { success: true, message: `Página ${page}: ${createdCount} novas, ${updatedCount} atualizadas.`, hasMore };
  } catch (err: any) {
    console.error('syncBlingCategoriesPageAction error:', err);
    return { success: false, error: err.message, hasMore: false };
  }
}

export async function syncBlingProductsPageAction(page: number = 1) {
  try {
    const { data: products, hasMore } = await BlingService.getProductsPage(page);
    if (!products || products.length === 0) {
      return { success: true, message: 'Nenhum produto encontrado.', hasMore: false };
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

    // We only need existing mapping for the products in THIS PAGE to minimize memory/DB calls
    const blingIds = products.map((p: any) => p.id.toString());
    const { data: existingData } = await supabase
      .from('stock_products')
      .select('id, bling_id, measurements, brand')
      .in('bling_id', blingIds);

    const existingMap = new Map();
    if (existingData) {
      existingData.forEach(e => existingMap.set(e.bling_id.toString(), { id: e.id, location: e.measurements?.location, brand: e.brand }));
    }

    const upsertBatch = [];

    for (const prod of products) {
      const blingId = prod.id.toString();
      const name = prod.nome;
      const code = prod.codigo;
      let price = parseFloat(prod.precoCusto || '0');

      const measurements = extractMeasurementsFromName(name);
      const partType = extractPartTypeFromName(name);
      const codes = extractCodesFromName(name);
      const brand = extractBrandFromName(name);
      
      const blingCatId = prod.categoria?.id?.toString();
      let categoryName = (blingCatId && familyMap.get(blingCatId)) || 'Desconhecida';
      
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

      const existingRecord = existingMap.get(blingId);
      if (existingRecord) {
        if (existingRecord.location) {
          payload.measurements.location = existingRecord.location;
        }
        if (existingRecord.brand && (!payload.brand || payload.brand.length <= 2 || existingRecord.brand.length > 2)) {
          payload.brand = existingRecord.brand;
        }
        payload.id = existingRecord.id;
        updatedCount++;
      } else {
        payload.id = `prod_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        payload.created_at = new Date().toISOString();
        createdCount++;
      }
      upsertBatch.push(payload);
    }

    if (upsertBatch.length > 0) {
      const { error } = await supabase.from('stock_products').upsert(upsertBatch, { onConflict: 'id' });
      if (error) console.error('Error during bulk upsert:', error);
    }

    return { success: true, message: `Página ${page}: ${createdCount} novos, ${updatedCount} atualizados.`, hasMore };
  } catch (err: any) {
    console.error('syncBlingProductsPageAction error:', err);
    return { success: false, error: err.message, hasMore: false };
  }
}

export async function syncBlingProductSuppliersPageAction(page: number = 1) {
  try {
    const { data: links, hasMore } = await BlingService.getProductSuppliersPage(page);
    if (!links || links.length === 0) {
      return { success: true, message: 'Nenhuma relação de fornecedor encontrada.', hasMore: false };
    }

    const supabase = await createClient();
    
    const { data: suppliersData } = await supabase.from('suppliers').select('id, name, bling_id');
    const suppliers = suppliersData || [];

    // Filter useful links
    const validLinks = links.filter((link: any) => link.produto?.id && link.fornecedor?.id);
    if (validLinks.length === 0) {
      return { success: true, message: `Página ${page}: 0 atualizados.`, hasMore };
    }

    const blingProductIds = validLinks.map((link: any) => link.produto.id.toString());
    const { data: productsInDb } = await supabase
      .from('stock_products')
      .select('id, bling_id')
      .in('bling_id', blingProductIds);

    const productMap = new Map();
    if (productsInDb) {
      productsInDb.forEach(p => productMap.set(p.bling_id.toString(), p.id));
    }

    const upsertBatch = [];
    let updatedCount = 0;

    for (const link of validLinks) {
      const dbProductId = productMap.get(link.produto.id.toString());
      if (!dbProductId) continue; // Product not synced yet or not active

      let supplierId = null;
      let match = suppliers.find(s => s.bling_id && s.bling_id === link.fornecedor.id);
      if (!match && link.fornecedor.nome) {
        const bName = link.fornecedor.nome.toLowerCase().trim();
        match = suppliers.find(s => {
          const sName = s.name.toLowerCase().trim();
          return bName === sName || bName.includes(sName) || sName.includes(bName);
        });
      }
      
      if (match) {
        supplierId = match.id;
      }

      if (supplierId || link.precoCusto) {
        const payload: any = { id: dbProductId };
        if (supplierId) payload.supplier_id = supplierId;
        if (link.precoCusto) payload.cost_price = parseFloat(link.precoCusto);
        upsertBatch.push(payload);
        updatedCount++;
      }
    }

    if (upsertBatch.length > 0) {
      const { error } = await supabase.from('stock_products').upsert(upsertBatch, { onConflict: 'id' });
      if (error) console.error('Error during bulk suppliers update:', error);
    }

    return { success: true, message: `Página ${page}: ${updatedCount} custos/fornecedores vinculados.`, hasMore };
  } catch (err: any) {
    console.error('syncBlingProductSuppliersPageAction error:', err);
    return { success: false, error: err.message, hasMore: false };
  }
}

export async function syncBlingStockPageAction(page: number = 1) {
  try {
    const supabase = await createClient();

    // Instead of while(true), we do ONE page here.
    const pageSize = 1000;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize - 1;

    const { data } = await supabase
      .from('stock_products')
      .select('id, bling_id')
      .not('bling_id', 'is', null)
      .range(startIndex, endIndex);

    if (!data || data.length === 0) {
      return { success: true, message: 'Fim da lista de produtos.', hasMore: false };
    }

    const hasMore = data.length === pageSize;
    const existingMap = new Map();
    const blingIds: string[] = [];
    
    data.forEach(e => {
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
      
      // Rate limit protection
      await new Promise(res => setTimeout(res, 350));

      for (const bal of balances) {
        const blingProductId = bal.produto?.id?.toString();
        const totalStock = bal.saldoFisicoTotal || 0;

        if (blingProductId) {
          const existingRow = existingMap.get(blingProductId);
          if (existingRow) {
            upsertBatch.push({ id: existingRow.id, stock: totalStock });
            updatedCount++;
          }
        }
      }
    }

    if (upsertBatch.length > 0) {
      const { error } = await supabase.from('stock_products').upsert(upsertBatch, { onConflict: 'id' });
      if (error) console.error('Error during bulk stock upsert:', error);
    }

    return { success: true, message: `Página ${page}: ${updatedCount} estoques atualizados.`, hasMore };
  } catch (err: any) {
    console.error('syncBlingStockPageAction error:', err);
    return { success: false, error: err.message, hasMore: false };
  }
}

export async function syncBlingContactsPageAction(page: number = 1) {
  try {
    const { data: contacts, hasMore } = await BlingService.getContactsPage(page);
    if (!contacts || contacts.length === 0) {
      return { success: true, message: 'Nenhum contato encontrado.', hasMore: false };
    }

    const supabase = await createClient();
    let createdCount = 0;
    let updatedCount = 0;

    const blingIds = contacts.map((c: any) => c.id.toString());
    const { data: existingClients } = await supabase
      .from('clients')
      .select('id, bling_id')
      .in('bling_id', blingIds);

    const existingMapByBlingId = new Map();
    if (existingClients) {
      existingClients.forEach(c => {
        if (c.bling_id) existingMapByBlingId.set(c.bling_id.toString(), c.id);
      });
    }

    const upsertBatch = [];

    for (const contact of contacts) {
      const blingId = contact.id.toString();
      const name = contact.nome;
      const cnpj = contact.numeroDocumento || '';

      const payload: any = { name, cnpj, bling_id: blingId };
      const existingId = existingMapByBlingId.get(blingId);
      
      if (existingId) {
        payload.id = existingId;
        updatedCount++;
      } else {
        createdCount++;
      }
      upsertBatch.push(payload);
    }

    if (upsertBatch.length > 0) {
      const { error } = await supabase.from('clients').upsert(upsertBatch, { onConflict: 'id' });
      if (error) console.error('Error during bulk clients upsert:', error);
    }

    return { success: true, message: `Página ${page}: ${createdCount} novos, ${updatedCount} atualizados.`, hasMore };
  } catch (err: any) {
    console.error('syncBlingContactsPageAction error:', err);
    return { success: false, error: err.message, hasMore: false };
  }
}

export async function syncSuppliersFromHardcodedListAction() {
  // This one only loops 17 items, so it's perfectly safe and no need to paginate
  try {
    const supabase = await createClient();
    
    // Map of known suppliers to preserve their original types
    const knownSuppliersTypeMap = new Map([
      [18166979175, 'Fornecedor Original'],
      [18166979682, 'Fornecedor Original'],
      [18166981906, 'Fornecedor Original'],
      [18166984492, 'Fornecedor Original'],
      [18166984588, 'Mercado Local'],
      [18166984689, 'Fornecedor Original'],
      [18180417442, 'Mercado Local'],
      [18180417930, 'Fornecedor Original'],
      [18219032503, 'Mercado Local'],
      [18221954746, 'Mercado Local'],
      [18240304442, 'Fornecedor Original'],
      [18268385717, 'Fornecedor Original'],
      [18278746092, 'Fornecedor Original'],
      [18278941418, 'Fornecedor Original'],
      [18287198560, 'Fornecedor Original'],
      [18287198687, 'Fornecedor Original'],
      [18309603230, 'Fornecedor Original'],
      [18241543511, 'Fornecedor Original'],
    ]);

    let createdCount = 0;
    let updatedCount = 0;
    
    // Use a Map to prevent duplicate IDs in the same upsert batch
    const upsertMap = new Map();
    // Keep track of processed bling ids to avoid processing same contact multiple times across different filters
    const processedBlingIds = new Set<string>();

    const { data: existingList } = await supabase.from('suppliers').select('id, bling_id, name');
    const existingMapByBlingId = new Map();
    const existingMapByName = new Map();
    if (existingList) {
      existingList.forEach((e: any) => {
        if (e.bling_id) existingMapByBlingId.set(e.bling_id.toString(), e.id);
        if (e.name) existingMapByName.set(e.name.trim().toLowerCase(), e.id);
      });
    }

    const processContacts = async (criterio?: number, idTipoContato?: number) => {
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const { data: contacts, hasMore: more } = await BlingService.getContactsPage(page, criterio, idTipoContato);
        hasMore = more;
        if (!contacts || contacts.length === 0) break;
        
        for (const sup of contacts) {
          const blingId = sup.id.toString();
          if (processedBlingIds.has(blingId)) continue;
          processedBlingIds.add(blingId);

          const supplierName = sup.nome;
          
          let supType = 'Mercado Local';
          if (knownSuppliersTypeMap.has(Number(blingId))) {
            supType = knownSuppliersTypeMap.get(Number(blingId))!;
          }

          let existingId = existingMapByBlingId.get(blingId);
          if (!existingId && supplierName) {
             existingId = existingMapByName.get(supplierName.trim().toLowerCase());
          }
          
          if (existingId) {
            existingMapByBlingId.set(blingId, existingId);
            existingMapByName.set(supplierName.trim().toLowerCase(), existingId);

            if (!upsertMap.has(existingId)) updatedCount++;
            
            upsertMap.set(existingId, {
              id: existingId,
              name: supplierName,
              type: supType,
              bling_id: Number(blingId)
            });
          } else {
            const newId = `sup_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
            existingMapByBlingId.set(blingId, newId);
            existingMapByName.set(supplierName.trim().toLowerCase(), newId);

            createdCount++;
            
            upsertMap.set(newId, {
              id: newId,
              name: supplierName,
              type: supType,
              bling_id: Number(blingId),
              created_at: new Date().toISOString()
            });
          }
        }
        
        page++;
        if (hasMore) await new Promise(res => setTimeout(res, 500));
      }
    };

    // 1. Fetch using standard criterio=2 (Fornecedores)
    await processContacts(2, undefined);

    // 2. Fetch contact types and find any custom "Fornecedor" tags
    const contactTypes = await BlingService.getContactTypes();
    const fornecedorTypes = contactTypes.filter((t: any) => t.descricao && t.descricao.toLowerCase().includes('fornecedor'));
    
    for (const type of fornecedorTypes) {
      await processContacts(undefined, type.id);
    }

    const upsertBatch = Array.from(upsertMap.values());
    if (upsertBatch.length > 0) {
      for (let i = 0; i < upsertBatch.length; i += 300) {
        const chunk = upsertBatch.slice(i, i + 300);
        const { error } = await supabase.from('suppliers').upsert(chunk, { onConflict: 'id' });
        if (error) throw new Error('Erro ao salvar no banco: ' + error.message);
      }
    }

    return { success: true, message: `Fornecedores sincronizados: ${createdCount} criados, ${updatedCount} atualizados.` };
  } catch (err: any) {
    console.error('syncSuppliersFromHardcodedListAction error:', err);
    return { success: false, error: err.message };
  }
}
