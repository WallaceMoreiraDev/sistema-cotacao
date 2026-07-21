export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}

export function formatMeasurement(val: number | undefined): string {
  if (val === undefined || val === null) return '-';
  return `${val} mm`;
}

export function formatCnpjMask(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function areItemsMatching(
  itemA: { name: string; code?: string; productId?: string; measurements?: any },
  itemB: { name: string; code?: string; productId?: string; measurements?: any }
): boolean {
  if (itemA.productId && itemB.productId && itemA.productId === itemB.productId) {
    return true;
  }
  if (itemA.name.trim().toLowerCase() !== itemB.name.trim().toLowerCase()) {
    return false;
  }
  if (itemA.code && itemB.code && itemA.code.trim().toLowerCase() !== itemB.code.trim().toLowerCase()) {
    return false;
  }
  const mA = itemA.measurements || {};
  const mB = itemB.measurements || {};

  return (
    (mA.innerDiameter ?? undefined) === (mB.innerDiameter ?? undefined) &&
    (mA.outerDiameter ?? undefined) === (mB.outerDiameter ?? undefined) &&
    (mA.height1 ?? undefined) === (mB.height1 ?? undefined) &&
    (mA.height2 ?? undefined) === (mB.height2 ?? undefined) &&
    (mA.thickness ?? undefined) === (mB.thickness ?? undefined) &&
    (mA.cs ?? undefined) === (mB.cs ?? undefined)
  );
}
