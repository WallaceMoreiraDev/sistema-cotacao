import type { Supplier } from '../types/database';

/**
 * Registered suppliers for the quotation system.
 * - Original: standard manufacturer/distributor — higher markup (70%)
 * - Local (Mercado Local): emergency/local purchase — lower markup (30%)
 */
export const SUPPLIERS = [
  { id: 'sippel', name: 'Sippel', type: 'Fornecedor Original' as const, defaultMarkup: 70 },
  { id: 'vedpira', name: 'VedPira', type: 'Mercado Local' as const, defaultMarkup: 30 },
];

/**
 * Helper to get a supplier by id.
 */
export function getSupplierById(id: string): Supplier | undefined {
  return SUPPLIERS.find((s) => s.id === id);
}

/**
 * Returns the default markup based on supplier type.
 */
export function getDefaultMarkup(supplierType: 'Fornecedor Original' | 'Mercado Local'): number {
  return supplierType === 'Fornecedor Original' ? 70 : 30;
}
