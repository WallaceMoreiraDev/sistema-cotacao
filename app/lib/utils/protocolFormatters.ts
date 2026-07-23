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

export function formatCpfMask(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function areItemsMatching(
  itemA: { name?: string; code?: string; productId?: string; brand?: string; measurements?: any },
  itemB: { name?: string; code?: string; productId?: string; brand?: string; measurements?: any }
): boolean {
  if (itemA.productId && itemB.productId && String(itemA.productId) === String(itemB.productId)) {
    return true;
  }
  if (String(itemA.name || '').trim().toLowerCase() !== String(itemB.name || '').trim().toLowerCase()) {
    return false;
  }
  if (itemA.code && itemB.code && String(itemA.code).trim().toLowerCase() !== String(itemB.code).trim().toLowerCase()) {
    return false;
  }
  if (String(itemA.brand || '').trim().toLowerCase() !== String(itemB.brand || '').trim().toLowerCase()) {
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
    (mA.crossSection ?? undefined) === (mB.crossSection ?? undefined)
  );
}

export function countUniqueProtocolItems(items: { name?: string; code?: string; productId?: string; brand?: string; measurements?: any }[] | undefined): number {
  if (!items || !Array.isArray(items) || items.length === 0) return 0;
  
  const uniqueItems: any[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    
    let isDuplicate = false;
    for (let j = 0; j < uniqueItems.length; j++) {
      if (areItemsMatching(uniqueItems[j], item)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      uniqueItems.push(item);
    }
  }
  
  return uniqueItems.length;
}
