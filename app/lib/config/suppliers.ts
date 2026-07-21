import type { Supplier } from '../types/database';

/**
 * Registered suppliers for the quotation system.
 * - Original: standard manufacturer/distributor — higher markup (70%)
 * - Local (Mercado Local): emergency/local purchase — lower markup (30%)
 */
export const SUPPLIERS: Supplier[] = [
  { id: 'sippel', name: 'Sippel', type: 'original', defaultMarkup: 70 },
  { id: 'vedpira', name: 'VedPira', type: 'local', defaultMarkup: 30 },
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
export function getDefaultMarkup(supplierType: 'original' | 'local'): number {
  return supplierType === 'original' ? 70 : 30;
}
