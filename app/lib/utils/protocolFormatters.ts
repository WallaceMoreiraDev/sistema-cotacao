export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}

export function formatMeasurement(val: number | undefined): string {
  if (val === undefined || val === null) return '-';
  if (Number.isInteger(val)) return `${val} mm`;
  
  const str = val.toString();
  const decimals = str.split('.')[1];
  if (decimals && decimals.length === 1) {
    return `${val.toFixed(2)} mm`;
  }
  
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
  itemA: { id?: string | number; sku?: string; name?: string; code?: string; productId?: string; brand?: string; measurements?: any },
  itemB: { id?: string | number; sku?: string; name?: string; code?: string; productId?: string; brand?: string; measurements?: any }
): boolean {
  // 1. Match exato por productId ou id (útil quando comparamos ProtocolItem com StockProduct)
  const idA = itemA.productId || itemA.id;
  const idB = itemB.productId || itemB.id;
  if (idA && idB && String(idA) === String(idB)) {
    return true;
  }

  // 2. Match exato por código/SKU (Se tiverem códigos idênticos e não vazios, são o mesmo produto)
  const codeA = String(itemA.code || itemA.sku || '').trim().toLowerCase();
  const codeB = String(itemB.code || itemB.sku || '').trim().toLowerCase();
  if (codeA && codeB && codeA === codeB) {
    return true;
  }

  // 3. Nome é obrigatório e deve bater, se os códigos não bateram
  if (String(itemA.name || '').trim().toLowerCase() !== String(itemB.name || '').trim().toLowerCase()) {
    return false;
  }

  // 4. Marca só bloqueia se AMBOS têm marca e diferem
  const brandA = String(itemA.brand || '').trim().toLowerCase();
  const brandB = String(itemB.brand || '').trim().toLowerCase();
  if (brandA && brandB && brandA !== brandB) {
    return false;
  }

  // 5. Medidas — aceita tanto "cs" quanto "crossSection" no campo de seção transversal
  const mA = itemA.measurements || {};
  const mB = itemB.measurements || {};
  const csA = mA.cs ?? mA.crossSection ?? undefined;
  const csB = mB.cs ?? mB.crossSection ?? undefined;

  return (
    (mA.innerDiameter ?? undefined) === (mB.innerDiameter ?? undefined) &&
    (mA.outerDiameter ?? undefined) === (mB.outerDiameter ?? undefined) &&
    (mA.height1 ?? undefined) === (mB.height1 ?? undefined) &&
    (mA.height2 ?? undefined) === (mB.height2 ?? undefined) &&
    (mA.thickness ?? undefined) === (mB.thickness ?? undefined) &&
    csA === csB
  );
}


export function countUniqueProtocolItems(items: { id?: string | number; sku?: string; name?: string; code?: string; productId?: string; brand?: string; measurements?: any }[] | undefined): number {
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
