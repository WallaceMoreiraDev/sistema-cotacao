import { createClient } from '../supabase/client';
import type { StockProduct } from '../types/database';

/**
 * Fetches the full stock catalog from Supabase stock_products table.
 */
export async function fetchStock(): Promise<StockProduct[]> {
  try {
    const supabase = createClient();
    
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('stock_products')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching stock from Supabase:', error);
        break;
      }
      
      if (!data || data.length === 0) {
        break;
      }
      
      allData = allData.concat(data);
      if (data.length < pageSize) {
        break;
      }
      page++;
    }

    // Map the database columns (snake_case) to application model (camelCase)
    return allData.map((row: any) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      code: row.code,
      stock: Number(row.stock),
      costPrice: Number(row.cost_price),
      category: row.category,
      brand: row.brand || undefined,
      measurements: row.measurements || {},
      part_type: row.part_type || undefined,
      parker_code: row.parker_code || undefined,
      oem_code: row.oem_code || undefined,
      supplier_code: row.supplier_code || undefined
    }));
  } catch (err) {
    console.error('Exception in fetchStock:', err);
    return [];
  }
}

/**
 * Searches the in-memory stock array by name, code, SKU, or measurement values.
 * Returns all matches (fuzzy substring match).
 */
export function searchStock(products: StockProduct[], searchQuery: string): StockProduct[] {
  const q = searchQuery.toLowerCase().trim();
  if (!q) return products;

  return products.filter((p) => {
    // 1. Descrição completa
    if (p.name && p.name.toLowerCase().includes(q)) return true;
    if (p.category && p.category.toLowerCase().includes(q)) return true;
    
    // 2. Código Força Máxima (FM-...)
    if (p.sku && p.sku.toLowerCase().includes(q)) return true;
    
    // 3. Código de Referência do Fornecedor e Código OEM
    if (p.code && p.code.toLowerCase().includes(q)) return true;
    
    // 4. Código Referência Parker Mundial (salvo em parker_code se tivermos no BD, mas se não, olhamos a string inteira)
    if ((p as any).parker_code && (p as any).parker_code.toLowerCase().includes(q)) return true;
    if ((p as any).oem_code && (p as any).oem_code.toLowerCase().includes(q)) return true;
    
    // 5. Tipo de Peça / Material
    if ((p as any).part_type && (p as any).part_type.toLowerCase().includes(q)) return true;
    
    // 6. Marca
    if (p.brand && p.brand.toLowerCase().includes(q)) return true;

    // 7. Medidas específicas (ex: "30x40x7")
    // Se o usuário digitou algo com 'x', vamos tentar ver se bate com as medidas do produto
    if (p.measurements) {
      // Se a string q contém números, tentamos achar em qualquer medida individual
      const numQuery = parseFloat(q.replace(',', '.'));
      if (!isNaN(numQuery)) {
        const vals = Object.values(p.measurements).filter(v => v !== null && v !== undefined) as number[];
        if (vals.some((v) => v === numQuery)) return true;
      }

      // Se a string tem formato "30x40" ou "30x40x7", vamos formatar as medidas do produto num padrão e comparar
      const prodMeasString = [
        p.measurements.innerDiameter,
        p.measurements.outerDiameter,
        p.measurements.height1,
        p.measurements.thickness
      ].filter(v => v !== null && v !== undefined).join('x').toLowerCase();
      
      const prodMeasStringAlt = [
        p.measurements.innerDiameter,
        p.measurements.outerDiameter,
        p.measurements.height1,
        p.measurements.height2
      ].filter(v => v !== null && v !== undefined).join('x').toLowerCase();

      const queryFormatted = q.replace(/\s+/g, '').replace(/\*/g, 'x'); // normaliza a busca
      if (prodMeasString.includes(queryFormatted) || prodMeasStringAlt.includes(queryFormatted)) return true;
    }

    return false;
  });
}

/**
 * Advanced stock search that filters products based on item form fields (Name, Code, OEM, Measurements).
 */
export function filterStockByForm(
  products: StockProduct[],
  searchQuery: string,
  form: {
    category?: string;
    name?: string;
    oemCode?: string;
    oem?: string;
    supplierCode?: string;
    code?: string;
    brand?: string;
    measurements: Record<string, string>;
  }
): StockProduct[] {
  let filtered = products;

  // Primeiro aplica a busca rápida (omni-search), se houver
  const q = searchQuery.trim().toLowerCase();
  if (q.length >= 2) {
    filtered = searchStock(filtered, q);
  }

  // Depois aplica os filtros dinâmicos preenchidos, refinando os resultados
  const name = (form.category || form.name || '').trim().toLowerCase();
  const oem = (form.oemCode || form.oem || '').trim().toLowerCase();
  const code = (form.supplierCode || form.code || '').trim().toLowerCase();
  const brand = (form.brand || '').trim().toLowerCase();
  const partType = ((form as any).partType || '').trim().toLowerCase();

  const mInnerRaw = form.measurements.innerDiameter.trim();
  const mOuterRaw = form.measurements.outerDiameter.trim();
  const mH1Raw = form.measurements.height1.trim();
  const mH2Raw = form.measurements.height2.trim();
  const mThickRaw = form.measurements.thickness.trim();
  const mCsRaw = form.measurements.cs.trim();

  const mInner = parseFloat(mInnerRaw.replace(',', '.'));
  const mOuter = parseFloat(mOuterRaw.replace(',', '.'));
  const mH1 = parseFloat(mH1Raw.replace(',', '.'));
  const mH2 = parseFloat(mH2Raw.replace(',', '.'));
  const mThick = parseFloat(mThickRaw.replace(',', '.'));
  const mCs = parseFloat(mCsRaw.replace(',', '.'));

  const hasFormInput =
    name.length >= 2 ||
    oem.length >= 2 ||
    code.length >= 2 ||
    brand.length >= 2 ||
    mInnerRaw !== '' ||
    mOuterRaw !== '' ||
    mH1Raw !== '' ||
    mH2Raw !== '' ||
    mThickRaw !== '' ||
    mCsRaw !== '' ||
    partType.length >= 2;

  if (!hasFormInput) return q.length >= 2 ? filtered : [];

  return filtered.filter((p) => {
    // String matching
    if (name.length >= 2 && !p.name?.toLowerCase().includes(name) && !p.category?.toLowerCase().includes(name) && !p.part_type?.toLowerCase().includes(name)) return false;
    if (oem.length >= 2 && !p.sku?.toLowerCase().includes(oem) && !p.code?.toLowerCase().includes(oem) && !(p as any).oem_code?.toLowerCase().includes(oem)) return false;
    if (code.length >= 2 && !p.code?.toLowerCase().includes(code) && !p.sku?.toLowerCase().includes(code) && !p.oem_code?.toLowerCase().includes(code) && !p.parker_code?.toLowerCase().includes(code) && !(p as any).supplier_code?.toLowerCase().includes(code)) return false;
    if (brand.length >= 2 && (!p.brand || !p.brand.toLowerCase().includes(brand))) return false;
    if (partType.length >= 2 && (!p.part_type || !p.part_type.toLowerCase().includes(partType))) return false;

    // Measurement strict matching
    if (mInnerRaw !== '') {
      if (isNaN(mInner)) return false; // Digitaram letras
      if (!p.measurements || p.measurements.innerDiameter !== mInner) return false;
    }
    if (mOuterRaw !== '') {
      if (isNaN(mOuter)) return false; 
      if (!p.measurements || p.measurements.outerDiameter !== mOuter) return false;
    }
    if (mH1Raw !== '') {
      if (isNaN(mH1)) return false;
      if (!p.measurements || p.measurements.height1 !== mH1) return false;
    }
    if (mH2Raw !== '') {
      if (isNaN(mH2)) return false;
      if (!p.measurements || p.measurements.height2 !== mH2) return false;
    }
    if (mThickRaw !== '') {
      if (isNaN(mThick)) return false;
      if (!p.measurements || p.measurements.thickness !== mThick) return false;
    }
    if (mCsRaw !== '') {
      if (isNaN(mCs)) return false;
      if (!p.measurements || p.measurements.cs !== mCs) return false;
    }

    return true;
  });
}

/**
 * Finds the best stock match for a given item name + optional measurements.
 * Used when adding an item to determine stock availability.
 */
export function findStockMatch(
  products: StockProduct[],
  itemName: string,
  itemMeasurements?: {
    innerDiameter?: number;
    outerDiameter?: number;
    height1?: number;
    height2?: number;
    thickness?: number;
    cs?: number;
  },
  itemBrand?: string
): StockProduct | null {
  const nameLower = itemName.trim().toLowerCase();
  if (!nameLower) return null;

  // First try exact name + brand + measurement match
  if (itemMeasurements) {
    const exactMatch = products.find((p) => {
      if (!p.name.toLowerCase().includes(nameLower)) return false;
      if (itemBrand && p.brand && !p.brand.toLowerCase().includes(itemBrand.trim().toLowerCase())) return false;
      if (!p.measurements) return false;

      const m = p.measurements;
      const im = itemMeasurements;

      // Check each provided measurement
      if (im.innerDiameter && m.innerDiameter !== im.innerDiameter) return false;
      if (im.outerDiameter && m.outerDiameter !== im.outerDiameter) return false;
      if (im.height1 && m.height1 !== im.height1) return false;
      if (im.height2 && m.height2 !== im.height2) return false;
      if (im.thickness && m.thickness !== im.thickness) return false;
      if (im.cs && m.cs !== im.cs) return false;

      return true;
    });
    if (exactMatch) return exactMatch;
  }

  // Fallback: name-only match (first result)
  return products.find((p) => p.name.toLowerCase().includes(nameLower)) ?? null;
}
