const aCotarItems = [
  {
    id: '1',
    quantity: '2.5',
    unitPrice: 10,
    markupPercent: undefined,
    salePrice: undefined,
    baseSubtotal: undefined,
    taxAmount: undefined,
    freightAmount: undefined,
    finalTotal: undefined,
    supplierId: 'sup1',
    code: 'FM-123',
    productId: 'prod1'
  }
];

const estoqueItems = [
  {
    id: '2',
    quantity: '1',
    unitPrice: 10,
    markupPercent: undefined,
    salePrice: undefined,
    baseSubtotal: undefined,
    taxAmount: undefined,
    freightAmount: undefined,
    finalTotal: undefined,
    code: 'FM-123',
    productId: 'prod1'
  }
];

const suppliers = [];
const supplierFreights = { 'sup1': 15 };
const supplierGroups = { 'sup1': aCotarItems };

function areItemsMatching(itemA, itemB) {
  return itemA.productId === itemB.productId;
}

function getFinalTablePrice(sku) {
  return 50;
}

// simulate hook iterations
let stateACotar = [...aCotarItems];
let stateEstoque = [...estoqueItems];

for (let iter = 1; iter <= 5; iter++) {
  console.log(`\n--- Iteration ${iter} ---`);
  let cotarChanged = false;
  let estoqueChanged = false;

  const newACotar = stateACotar.map(item => {
    let currentCostPrice = item.unitPrice;
    let currentProductId = item.productId;
    let changedByLock = false;

    if (!currentCostPrice || currentCostPrice <= 0) {
      const matchingEstoque = stateEstoque.find(est => areItemsMatching(est, item) && (est.costPrice ?? 0) > 0);
      if (matchingEstoque) {
        currentCostPrice = matchingEstoque.costPrice;
        currentProductId = matchingEstoque.productId;
        changedByLock = true;
      }
    }

    const isMisto = stateEstoque.some(est => areItemsMatching(est, item));
    const sku = item.code || item.oem_code;
    const tablePrice = isMisto ? getFinalTablePrice(sku) : null;

    const supId = item.supplierId;
    const baseCost = item.unitPrice ?? 0;
    let mk = item.markupPercent ?? 70;

    let sp = 0;
    let subtotalBaseLinha = 0;
    let subtotalComImposto = 0;
    let taxAmount = 0;

    if (tablePrice !== null) {
      sp = tablePrice;
      subtotalComImposto = sp * Number(item.quantity);
      subtotalBaseLinha = subtotalComImposto / 1.045;
      taxAmount = subtotalComImposto - subtotalBaseLinha;
      mk = undefined;
    } else {
      if (item.markupPercent === undefined) mk = 70;
      const precoVendaBase = baseCost * (1 + mk / 100);
      subtotalBaseLinha = precoVendaBase * Number(item.quantity);
      subtotalComImposto = subtotalBaseLinha * 1.045;
      taxAmount = subtotalComImposto - subtotalBaseLinha;
    }

    let totalFinalVenda = subtotalComImposto;
    let rateioFrete = 0;

    if (supId) {
      const totalSubtotalBaseSupplier = supplierGroups[supId].reduce((acc, i) => {
        const iMk = i.markupPercent ?? 70;
        const iBaseCost = i.unitPrice ?? 0;
        return acc + (iBaseCost * (1 + iMk / 100)) * Number(i.quantity);
      }, 0);

      const peso = totalSubtotalBaseSupplier > 0 ? (subtotalBaseLinha / totalSubtotalBaseSupplier) : 0;
      const freightCost = supplierFreights[supId] || 0;
      rateioFrete = freightCost * peso;
      
      const isLockedByStock = (currentCostPrice ?? 0) > 0;
      if (!isLockedByStock) {
        totalFinalVenda += rateioFrete;
      }
    }

    if (tablePrice === null) {
      sp = totalFinalVenda / Number(item.quantity);
    }

    if (
      changedByLock ||
      Math.abs((item.salePrice ?? 0) - sp) > 0.001 ||
      Math.abs((item.baseSubtotal ?? 0) - subtotalBaseLinha) > 0.001 ||
      Math.abs((item.taxAmount ?? 0) - taxAmount) > 0.001 ||
      Math.abs((item.freightAmount ?? 0) - rateioFrete) > 0.001 ||
      Math.abs((item.finalTotal ?? 0) - totalFinalVenda) > 0.001 ||
      item.markupPercent !== mk
    ) {
      cotarChanged = true;
      return { 
        ...item, 
        costPrice: currentCostPrice,
        productId: currentProductId,
        salePrice: sp,
        markupPercent: mk,
        baseSubtotal: subtotalBaseLinha,
        taxAmount,
        freightAmount: rateioFrete,
        finalTotal: totalFinalVenda
      };
    }
    return item;
  });

  const newEstoque = stateEstoque.map(est => {
    const linkedACotar = newACotar.find(ac => (
       (ac.productId && ac.productId === est.productId) || areItemsMatching(est, ac)
    ));
    
    if (linkedACotar) {
      const sku = est.code || est.oem_code;
      const tablePrice = getFinalTablePrice(sku);
      
      let sp = 0;
      let mk = linkedACotar.markupPercent ?? 70;
      const baseCost = linkedACotar.unitPrice ?? 0;

      if (tablePrice !== null) {
        sp = tablePrice;
        mk = undefined;
      } else {
        sp = linkedACotar.salePrice ?? 0;
      }

      const subtotalComImposto = sp * Number(est.quantity);
      const subtotalBaseLinha = subtotalComImposto / 1.045;
      const taxAmount = subtotalComImposto - subtotalBaseLinha;

      if (
        Math.abs((est.salePrice ?? 0) - sp) > 0.001 ||
        Math.abs((est.baseSubtotal ?? 0) - subtotalBaseLinha) > 0.001 ||
        Math.abs((est.taxAmount ?? 0) - taxAmount) > 0.001 ||
        Math.abs((est.freightAmount ?? 0) - 0) > 0.001 ||
        Math.abs((est.finalTotal ?? 0) - subtotalComImposto) > 0.001 ||
        est.unitPrice !== baseCost ||
        est.markupPercent !== mk
      ) {
        estoqueChanged = true;
        return { 
          ...est, 
          unitPrice: baseCost,
          salePrice: sp,
          markupPercent: mk,
          needsApproval: linkedACotar.needsApproval,
          approvalStatus: linkedACotar.approvalStatus,
          isMarkupDirty: linkedACotar.isMarkupDirty,
          baseSubtotal: subtotalBaseLinha,
          taxAmount,
          freightAmount: 0,
          finalTotal: subtotalComImposto
        };
      }
    }
    return est;
  });

  console.log(`cotarChanged: ${cotarChanged}, estoqueChanged: ${estoqueChanged}`);
  if (cotarChanged) stateACotar = newACotar;
  if (estoqueChanged) stateEstoque = newEstoque;
}
