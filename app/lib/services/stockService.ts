import { createClient } from '../supabase/client';
import type { StockProduct } from '../types/database';

/**
 * Fetches the full stock catalog from Supabase stock_products table.
 */
export async function fetchStock(): Promise<StockProduct[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('stock_products')
      .select('*');

    if (error) {
      console.error('Error fetching stock from Supabase:', error);
      return [];
    }

    // Map the database columns (snake_case) to application model (camelCase)
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      code: row.code,
      stock: Number(row.stock),
      costPrice: Number(row.cost_price),
      category: row.category,
      brand: row.brand || undefined,
      measurements: row.measurements || {}
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
export function searchStock(products: StockProduct[], query: string): StockProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return products.filter((p) => {
    // Match by name
    if (p.name.toLowerCase().includes(q)) return true;
    // Match by code
    if (p.code.toLowerCase().includes(q)) return true;
    // Match by SKU
    if (p.sku.toLowerCase().includes(q)) return true;
    // Match by category
    if (p.category.toLowerCase().includes(q)) return true;
    // Match by brand
    if (p.brand && p.brand.toLowerCase().includes(q)) return true;

    // Match by measurement values (user types a number like "50" or "120")
    if (p.measurements) {
      const numQuery = parseFloat(q);
      if (!isNaN(numQuery)) {
        const vals = Object.values(p.measurements).filter((v) => v !== undefined) as number[];
        if (vals.some((v) => v === numQuery)) return true;
      }
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
    name: string;
    oem: string;
    code: string;
    brand?: string;
    measurements: Record<string, string>;
  }
): StockProduct[] {
  // If explicitly searching via sidebar query
  const q = searchQuery.trim().toLowerCase();
  if (q.length >= 2) {
    return searchStock(products, q);
  }

  // Otherwise, filter dynamically based on filled form fields
  const name = form.name.trim().toLowerCase();
  const oem = form.oem.trim().toLowerCase();
  const code = form.code.trim().toLowerCase();
  const brand = (form.brand || '').trim().toLowerCase();

  const mInner = parseFloat(form.measurements.innerDiameter);
  const mOuter = parseFloat(form.measurements.outerDiameter);
  const mH1 = parseFloat(form.measurements.height1);
  const mH2 = parseFloat(form.measurements.height2);
  const mThick = parseFloat(form.measurements.thickness);
  const mCs = parseFloat(form.measurements.cs);

  const hasFormInput =
    name.length >= 2 ||
    oem.length >= 2 ||
    code.length >= 2 ||
    brand.length >= 2 ||
    !isNaN(mInner) ||
    !isNaN(mOuter) ||
    !isNaN(mH1) ||
    !isNaN(mH2) ||
    !isNaN(mThick) ||
    !isNaN(mCs);

  if (!hasFormInput) return [];

  return products.filter((p) => {
    // Check name
    if (name.length >= 2 && !p.name.toLowerCase().includes(name) && !p.category.toLowerCase().includes(name)) {
      return false;
    }

    // Check OEM
    if (oem.length >= 2 && !p.sku.toLowerCase().includes(oem) && !p.code.toLowerCase().includes(oem)) {
      return false;
    }

    // Check Code
    if (code.length >= 2 && !p.code.toLowerCase().includes(code) && !p.sku.toLowerCase().includes(code)) {
      return false;
    }

    // Check Brand
    if (brand.length >= 2 && p.brand && !p.brand.toLowerCase().includes(brand)) {
      return false;
    }

    // Check Measurements
    if (p.measurements) {
      if (!isNaN(mInner) && p.measurements.innerDiameter !== undefined && p.measurements.innerDiameter !== mInner) {
        return false;
      }
      if (!isNaN(mOuter) && p.measurements.outerDiameter !== undefined && p.measurements.outerDiameter !== mOuter) {
        return false;
      }
      if (!isNaN(mH1) && p.measurements.height1 !== undefined && p.measurements.height1 !== mH1) {
        return false;
      }
      if (!isNaN(mH2) && p.measurements.height2 !== undefined && p.measurements.height2 !== mH2) {
        return false;
      }
      if (!isNaN(mThick) && p.measurements.thickness !== undefined && p.measurements.thickness !== mThick) {
        return false;
      }
      if (!isNaN(mCs) && p.measurements.cs !== undefined && p.measurements.cs !== mCs) {
        return false;
      }
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
