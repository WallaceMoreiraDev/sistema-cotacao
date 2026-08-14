import { useState, useCallback } from 'react';
import type { ProtocolItem, StockProduct } from '../types/database';
import { areItemsMatching, formatMeasurement } from '../utils/protocolFormatters';
import { buildSmartDescription, generateFMCode } from '../utils/productNameBuilder';
import { ItemFormState, EMPTY_ITEM_FORM } from '../config/protocolForm';
import { findStockMatch } from '../services/stockService';
import { getDefaultMarkup } from '../config/suppliers';
import type { SupplierRow } from '../actions/suppliers';

export function useProtocolState(initialEstoque: ProtocolItem[] = [], initialACotar: ProtocolItem[] = [], suppliers: SupplierRow[] = []) {
  const [estoqueItems, setEstoqueItems] = useState<ProtocolItem[]>(initialEstoque);
  const [aCotarItems, setACotarItems] = useState<ProtocolItem[]>(initialACotar);
  const [itemCounter, setItemCounter] = useState(0);

  const [itemForm, setItemForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const getFreeStock = useCallback((identifier: string, stockProducts: StockProduct[]) => {
    const product = stockProducts.find(p => (p.code || p.sku || p.name) === identifier);
    if (!product) return 0;

    let available = product.stock;
    const localConsumed = estoqueItems
      .filter(i => (i.code || i.oem_code || i.name) === identifier)
      .reduce((sum, i) => sum + Number(i.quantity), 0);

    return Math.max(0, available - localConsumed);
  }, [estoqueItems]);

  const handleAddItem = useCallback((stockProducts: StockProduct[], isValid: boolean) => {
    if (!isValid) return;
    const qty = parseFloat(itemForm.quantity);
    const measurements = {
      innerDiameter: parseFloat(itemForm.measurements.innerDiameter) || undefined,
      outerDiameter: parseFloat(itemForm.measurements.outerDiameter) || undefined,
      height1: parseFloat(itemForm.measurements.height1) || undefined,
      height2: parseFloat(itemForm.measurements.height2) || undefined,
      thickness: parseFloat(itemForm.measurements.thickness) || undefined,
      cs: parseFloat(itemForm.measurements.cs) || undefined,
    };

    const match = findStockMatch(stockProducts, itemForm.category, measurements, itemForm.brand);
    const identifier = match ? (match.code || match.sku || match.name) : '';
    const availableStock = match ? getFreeStock(identifier, stockProducts) : 0;

    let newCounter = itemCounter;

    if (!itemForm.ignoreStock && match && availableStock > 0) {
      const stockQty = Math.min(qty, availableStock);
      const remainQty = qty - stockQty;

      newCounter++;
      const stockItem: ProtocolItem = {
        id: `item-${Date.now()}-e`,
        name: itemForm.category || 'N/A',
        quantity: stockQty,
        unitPrice: match.costPrice,
        costPrice: match.costPrice,
        type: 'estoque',
        status: 'pendente',
        oem_code: itemForm.oemCode || match.oem_code || undefined,
        code: match.code || (itemForm.supplierCode ? `FM-${itemForm.supplierCode.toUpperCase()}` : undefined),
        brand: itemForm.brand || match.brand || undefined,
        part_type: itemForm.partType || match.part_type || undefined,
        parker_code: itemForm.parkerCode || match.parker_code || undefined,
        description: itemForm.description || undefined,
        measurements,
        stockQty: availableStock,
        productId: match.id,
        markupPercent: 70,
        salePrice: match.costPrice * 1.7,
      };
      setEstoqueItems(prev => {
        const existingIdx = prev.findIndex(i => areItemsMatching(i, stockItem));
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + stockQty };
          return updated;
        }
        return [...prev, stockItem];
      });

      if (remainQty > 0) {
        newCounter++;
        const quotedItem: ProtocolItem = {
          id: `item-${Date.now()}-c`,
          name: itemForm.category || 'N/A',
          quantity: remainQty,
          unitPrice: 0,
          type: 'a_cotar',
          status: 'pendente',
          oem_code: itemForm.oemCode || undefined,
          code: itemForm.supplierCode ? `FM-${itemForm.supplierCode.toUpperCase()}` : undefined,
          brand: itemForm.brand || undefined,
          part_type: itemForm.partType || undefined,
          parker_code: itemForm.parkerCode || undefined,
          description: itemForm.description || undefined,
          measurements,
          markupPercent: undefined,
          salePrice: 0,
        };
        setACotarItems(prev => {
          const existingIdx = prev.findIndex(i => areItemsMatching(i, quotedItem));
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + remainQty };
            return updated;
          }
          return [...prev, quotedItem];
        });
        setAddFeedback(`Estoque parcial: ${stockQty} un. → Estoque, ${remainQty} un. → A Cotar`);
      } else {
        setAddFeedback(`${stockQty} un. adicionadas à lista de Estoque`);
      }
    } else {
      newCounter++;
      const quotedItem: ProtocolItem = {
        id: `item-${Date.now()}-c`,
        name: itemForm.category || 'N/A',
        quantity: qty,
        unitPrice: 0,
        type: 'a_cotar',
        status: 'pendente',
        oem_code: itemForm.oemCode || undefined,
        code: itemForm.supplierCode ? `FM-${itemForm.supplierCode.toUpperCase()}` : undefined,
        brand: itemForm.brand || undefined,
        part_type: itemForm.partType || undefined,
        parker_code: itemForm.parkerCode || undefined,
        description: itemForm.description || undefined,
        measurements,
        markupPercent: undefined,
        salePrice: 0,
      };
      setACotarItems(prev => {
        const existingIdx = prev.findIndex(i => areItemsMatching(i, quotedItem));
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + qty };
          return updated;
        }
        return [...prev, quotedItem];
      });
      setAddFeedback(itemForm.ignoreStock ? 'Item enviado para cotação (Estoque ignorado)' : 'Sem estoque disponível — item enviado para cotação');
    }

    setItemCounter(newCounter);
    setItemForm(EMPTY_ITEM_FORM);
    setTimeout(() => setAddFeedback(null), 4000);
  }, [itemForm, itemCounter, getFreeStock]);

  const handleAddStockItem = useCallback((match: StockProduct, qty: number, ignoreStock: boolean) => {
    if (qty <= 0) return;
    const identifier = match.code || match.sku || match.name;
    const availableStock = getFreeStock(identifier, [match]);

    let newCounter = itemCounter;

    if (!ignoreStock && availableStock > 0) {
      const stockQty = Math.min(qty, availableStock);
      const remainQty = qty - stockQty;

      newCounter++;
      const stockItem: ProtocolItem = {
        id: `item-${Date.now()}-e`,
        name: match.category || match.name || 'N/A',
        quantity: stockQty,
        unitPrice: match.costPrice,
        costPrice: match.costPrice,
        type: 'estoque',
        status: 'pendente',
        oem_code: match.oem_code || undefined,
        code: match.code || match.sku || undefined,
        brand: match.brand || undefined,
        part_type: match.part_type || undefined,
        parker_code: match.parker_code || undefined,
        description: match.name || undefined,
        measurements: match.measurements || {},
        stockQty: availableStock,
        productId: match.id,
        markupPercent: 70,
        salePrice: match.costPrice * 1.7,
      };
      setEstoqueItems(prev => {
        const existingIdx = prev.findIndex(i => areItemsMatching(i, stockItem));
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + stockQty };
          return updated;
        }
        return [...prev, stockItem];
      });

      if (remainQty > 0) {
        newCounter++;
        const quotedItem: ProtocolItem = {
          id: `item-${Date.now()}-c`,
          name: match.category || match.name || 'N/A',
          quantity: remainQty,
          costPrice: match.costPrice,
          type: 'a_cotar',
          status: 'pendente',
          oem_code: match.oem_code || undefined,
          code: match.code || match.sku || undefined,
          brand: match.brand || undefined,
          part_type: match.part_type || undefined,
          parker_code: match.parker_code || undefined,
          description: match.name || undefined,
          measurements: match.measurements || {},
          markupPercent: 70,
          salePrice: (match.costPrice || 0) * 1.7,
          unitPrice: match.costPrice || 0,
        };
        setACotarItems(prev => {
          const existingIdx = prev.findIndex(i => areItemsMatching(i, quotedItem));
          if (existingIdx >= 0) {
            const updated = [...prev];
            const existing = updated[existingIdx];
            updated[existingIdx] = { 
              ...existing, 
              quantity: existing.quantity + remainQty,
              costPrice: existing.costPrice || quotedItem.costPrice,
              unitPrice: existing.costPrice ? existing.unitPrice : quotedItem.unitPrice,
              salePrice: existing.costPrice ? existing.salePrice : quotedItem.salePrice,
              markupPercent: existing.costPrice ? existing.markupPercent : quotedItem.markupPercent
            };
            return updated;
          }
          return [...prev, quotedItem];
        });
        setAddFeedback(`Estoque parcial: ${stockQty} un. → Estoque, ${remainQty} un. → A Cotar`);
      } else {
        setAddFeedback(`${stockQty} un. adicionadas à lista de Estoque`);
      }
    } else {
      newCounter++;
      const localConsumed = estoqueItems
        .filter(i => (i.code || i.oem_code || i.name) === identifier)
        .reduce((sum, i) => sum + Number(i.quantity), 0);
      const isMisto = localConsumed > 0 && !ignoreStock;

      const quotedItem: ProtocolItem = {
        id: `item-${Date.now()}-c`,
        name: match.category || match.name || 'N/A',
        quantity: qty,
        unitPrice: isMisto ? (match.costPrice || 0) : 0,
        costPrice: isMisto ? match.costPrice : undefined,
        type: 'a_cotar',
        status: 'pendente',
        oem_code: match.oem_code || undefined,
        code: match.code || match.sku || undefined,
        brand: match.brand || undefined,
        part_type: match.part_type || undefined,
        parker_code: match.parker_code || undefined,
        description: match.name || undefined,
        measurements: match.measurements || {},
        markupPercent: isMisto ? 70 : undefined,
        salePrice: isMisto ? (match.costPrice || 0) * 1.7 : 0,
      };
      setACotarItems(prev => {
        const existingIdx = prev.findIndex(i => areItemsMatching(i, quotedItem));
        if (existingIdx >= 0) {
          const updated = [...prev];
          const existing = updated[existingIdx];
          updated[existingIdx] = { 
            ...existing, 
            quantity: existing.quantity + qty,
            costPrice: existing.costPrice || quotedItem.costPrice,
            unitPrice: existing.costPrice ? existing.unitPrice : quotedItem.unitPrice,
            salePrice: existing.costPrice ? existing.salePrice : quotedItem.salePrice,
            markupPercent: existing.costPrice ? existing.markupPercent : quotedItem.markupPercent
          };
          return updated;
        }
        return [...prev, quotedItem];
      });
      setAddFeedback(ignoreStock ? 'Item enviado para cotação (Estoque ignorado)' : 'Sem estoque disponível — item enviado para cotação');
    }

    setItemCounter(newCounter);
    setTimeout(() => setAddFeedback(null), 4000);
  }, [itemCounter, getFreeStock]);

  const handleCreateNewItem = useCallback(() => {
    let newCounter = itemCounter + 1;
    
    const qty = Number(itemForm.quantity) || 1;
    if (qty <= 0) return;

    // Transform string measurements to number
    const measurements = {
      innerDiameter: itemForm.measurements.innerDiameter ? Number(itemForm.measurements.innerDiameter) : undefined,
      outerDiameter: itemForm.measurements.outerDiameter ? Number(itemForm.measurements.outerDiameter) : undefined,
      height1: itemForm.measurements.height1 ? Number(itemForm.measurements.height1) : undefined,
      height2: itemForm.measurements.height2 ? Number(itemForm.measurements.height2) : undefined,
      thickness: itemForm.measurements.thickness ? Number(itemForm.measurements.thickness) : undefined,
      cs: itemForm.measurements.cs ? Number(itemForm.measurements.cs) : undefined,
    };

    const smartName = buildSmartDescription({
      category: itemForm.category,
      measurements: measurements,
      partType: itemForm.partType,
      supplierCode: itemForm.supplierCode,
      parkerOemCode: itemForm.parkerCode || itemForm.oemCode,
      brand: itemForm.brand,
    });
    
    const fmCode = generateFMCode(itemForm.supplierCode);

    const newItem: ProtocolItem = {
      id: `item-${Date.now()}-c`,
      name: smartName || itemForm.category || 'NOVO ITEM',
      quantity: qty,
      unitPrice: 0,
      type: 'a_cotar',
      status: 'pendente',
      oem_code: itemForm.oemCode || undefined,
      code: fmCode || undefined,
      brand: itemForm.brand || undefined,
      part_type: itemForm.partType || undefined,
      parker_code: itemForm.parkerCode || undefined,
      description: itemForm.description || undefined,
      measurements,
      markupPercent: undefined,
      salePrice: 0,
    };

    setACotarItems(prev => [...prev, newItem]);
    setItemCounter(newCounter);
    setItemForm(EMPTY_ITEM_FORM);
    setAddFeedback('Novo item criado e adicionado para cotação');
    setTimeout(() => setAddFeedback(null), 4000);
  }, [itemForm, itemCounter]);

  const handleReallocate = useCallback((id: string, maxQty: number, stockProducts: StockProduct[]) => {
    const targetItem = aCotarItems.find(i => i.id === id);
    if (!targetItem) return;

    const currentQty = Number(targetItem.quantity);
    const qtyToMove = Math.min(currentQty, maxQty);

    const identifier = targetItem.code || targetItem.oem_code || targetItem.name;
    const product = stockProducts.find(p => (p.code || p.sku || p.name) === identifier);
    const costPrice = product ? product.costPrice : 0;

    const newEstoqueItem: ProtocolItem = {
      ...targetItem,
      id: `item-${Date.now()}-${Math.random()}`,
      type: 'estoque',
      quantity: qtyToMove,
      markupPercent: 70,
      costPrice: costPrice,
      unitPrice: costPrice,
      salePrice: costPrice * 1.7,
      needsApproval: false,
    };

    setEstoqueItems(prev => {
      const existingIdx = prev.findIndex(i => areItemsMatching(i, newEstoqueItem));
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: Number(updated[existingIdx].quantity) + qtyToMove };
        return updated;
      }
      return [...prev, newEstoqueItem];
    });

    if (qtyToMove === currentQty) {
      setACotarItems(prev => prev.filter(i => i.id !== id));
    } else {
      setACotarItems(prev =>
        prev.map(i => (i.id === id ? { ...i, quantity: currentQty - qtyToMove } : i))
      );
    }
  }, [aCotarItems]);

  const removeEstoqueItem = useCallback((id: string) => {
    setEstoqueItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateEstoqueItemQuantity = useCallback((id: string, newQty: number) => {
    if (newQty < 1 || isNaN(newQty)) return;
    setEstoqueItems(prev => prev.map(i => (i.id === id ? { ...i, quantity: newQty } : i)));
  }, []);

  const splitEstoqueItem = useCallback((id: string, maxStock: number, excessQty: number) => {
    const item = estoqueItems.find(i => i.id === id);
    if (!item) return;

    setACotarItems(cotarPrev => {
      const quotedItem: ProtocolItem = {
        ...item,
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-c`,
        quantity: excessQty,
        type: 'a_cotar',
        status: 'pendente',
        markupPercent: 70, // Or get default markup
        salePrice: (item.costPrice || 0) * 1.7,
        unitPrice: item.costPrice || 0,
        needsApproval: false,
      };

      const existingIdx = cotarPrev.findIndex(i => areItemsMatching(i, quotedItem));
      if (existingIdx >= 0) {
        const updated = [...cotarPrev];
        const existing = updated[existingIdx];
        updated[existingIdx] = { 
          ...existing, 
          quantity: Number(existing.quantity) + excessQty,
          costPrice: existing.costPrice || quotedItem.costPrice,
          unitPrice: existing.costPrice ? existing.unitPrice : quotedItem.unitPrice,
          salePrice: existing.costPrice ? existing.salePrice : quotedItem.salePrice,
          markupPercent: existing.costPrice ? existing.markupPercent : quotedItem.markupPercent
        };
        return updated;
      }
      return [...cotarPrev, quotedItem];
    });

    setEstoqueItems(prev => prev.map(i => (i.id === id ? { ...i, quantity: maxStock } : i)).filter(i => i.quantity > 0));
  }, [estoqueItems]);

  const splitMultipleEstoqueItems = useCallback((splits: { id: string; maxStock: number; excessQty: number }[]) => {
    if (splits.length === 0) return;

    setACotarItems(cotarPrev => {
      let updatedCotar = [...cotarPrev];

      for (const split of splits) {
        const item = estoqueItems.find(i => i.id === split.id);
        if (!item) continue;

        const quotedItem: ProtocolItem = {
          ...item,
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-c`,
          quantity: split.excessQty,
          type: 'a_cotar',
          status: 'pendente',
          markupPercent: 70,
          salePrice: (item.costPrice || 0) * 1.7,
          unitPrice: item.costPrice || 0,
          needsApproval: false,
        };

        const existingIdx = updatedCotar.findIndex(i => areItemsMatching(i, quotedItem));
        if (existingIdx >= 0) {
          const existing = updatedCotar[existingIdx];
          updatedCotar[existingIdx] = {
            ...existing,
            quantity: Number(existing.quantity) + split.excessQty,
            costPrice: existing.costPrice || quotedItem.costPrice,
            unitPrice: existing.costPrice ? existing.unitPrice : quotedItem.unitPrice,
            salePrice: existing.costPrice ? existing.salePrice : quotedItem.salePrice,
            markupPercent: existing.costPrice ? existing.markupPercent : quotedItem.markupPercent
          };
        } else {
          updatedCotar.push(quotedItem);
        }
      }
      return updatedCotar;
    });

    setEstoqueItems(prev => {
      return prev.map(i => {
        const split = splits.find(s => s.id === i.id);
        return split ? { ...i, quantity: split.maxStock } : i;
      }).filter(i => i.quantity > 0);
    });
  }, [estoqueItems]);

  const removeACotarItem = useCallback((id: string) => {
    setACotarItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateACotarItemQuantity = useCallback((id: string, newQty: number) => {
    if (newQty < 1 || isNaN(newQty)) return;
    setACotarItems(prev => prev.map(i => (i.id === id ? { ...i, quantity: newQty } : i)));
  }, []);

  const updateSupplierCost = useCallback((itemId: string, supplierId: string, cost: number) => {
    setACotarItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        const newCosts = { ...(item.supplierCosts || {}) };
        newCosts[supplierId] = cost;
        
        const hasStockCost = (item.costPrice ?? 0) > 0;
        
        const validEntries = Object.entries(newCosts).filter(([_, v]) => v > 0);
        let cheapestSupplierId: string | null = null;
        let baseCost = 0;
        
        if (validEntries.length > 0) {
          const cheapest = validEntries.reduce((min, current) => current[1] < min[1] ? current : min);
          cheapestSupplierId = cheapest[0];
          baseCost = cheapest[1];
        }

        if (hasStockCost) {
          baseCost = item.costPrice!;
        }

        let supplierType: 'Fornecedor Original' | 'Mercado Local' = 'Fornecedor Original'; // Fallback
        if (!hasStockCost && cheapestSupplierId) {
          const sup = suppliers.find(s => String(s.id) === cheapestSupplierId);
          if (sup && (sup.type === 'Fornecedor Original' || sup.type === 'Mercado Local')) {
            supplierType = sup.type;
          }
        }

        const defaultMk = getDefaultMarkup(supplierType);
        const mk = !item.isMarkupDirty ? defaultMk : (item.markupPercent ?? defaultMk);
        const salePrice = baseCost * (1 + mk / 100);

        return { 
          ...item, 
          supplierCosts: newCosts, 
          unitPrice: baseCost, 
          markupPercent: mk,
          salePrice 
        };
      })
    );
  }, [suppliers]);


  const updateItemMarkup = useCallback((itemId: string, value: string) => {
    const isReset = value.trim() === '';
    
    setACotarItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;

        const validEntries = Object.entries(item.supplierCosts || {}).filter(([_, v]) => v > 0);
        let cheapestSupplierId: string | null = null;
        if (validEntries.length > 0) {
          const cheapest = validEntries.reduce((min, current) => current[1] < min[1] ? current : min);
          cheapestSupplierId = cheapest[0];
        }

        let supplierType: 'Fornecedor Original' | 'Mercado Local' = 'Fornecedor Original'; // Fallback
        const hasStockCost = (item.costPrice ?? 0) > 0;

        if (!hasStockCost && cheapestSupplierId) {
          const sup = suppliers.find(s => String(s.id) === cheapestSupplierId);
          if (sup && (sup.type === 'Fornecedor Original' || sup.type === 'Mercado Local')) {
            supplierType = sup.type;
          }
        }

        const defaultMk = getDefaultMarkup(supplierType);
        const numVal = isReset ? defaultMk : (parseFloat(value) || 0);
        const needsApproval = numVal !== defaultMk;
        
        let baseCost = item.unitPrice ?? 0;
        if (hasStockCost) {
          baseCost = item.costPrice!;
        }

        const salePrice = baseCost * (1 + numVal / 100);

        let approvalStatus = item.approvalStatus;
        if (numVal !== item.markupPercent) {
          approvalStatus = 'pending';
        }

        const isMarkupDirty = !isReset && needsApproval;

        return { ...item, markupPercent: numVal, salePrice, unitPrice: baseCost, needsApproval, approvalStatus, isMarkupDirty };
      })
    );
  }, [suppliers]);

  const updateItemField = useCallback((field: keyof ItemFormState, value: string | boolean) => {
    setItemForm(prev => {
      if (field in prev.measurements) {
        return { ...prev, measurements: { ...prev.measurements, [field]: value } };
      }
      return { ...prev, [field]: value };
    });
  }, []);

  const updateMeasurement = useCallback((key: keyof ItemFormState['measurements'], value: string) => {
    setItemForm(prev => ({
      ...prev,
      measurements: { ...prev.measurements, [key]: value.replace(',', '.') },
    }));
  }, []);

  const clearItemForm = useCallback(() => {
    setItemForm(EMPTY_ITEM_FORM);
  }, []);

  return {
    estoqueItems,
    setEstoqueItems,
    aCotarItems,
    setACotarItems,
    itemForm,
    setItemForm,
    addFeedback,
    getFreeStock,
    handleAddItem,
    handleAddStockItem,
    handleCreateNewItem,
    handleReallocate,
    removeEstoqueItem,
    updateEstoqueItemQuantity,
    splitEstoqueItem,
    splitMultipleEstoqueItems,
    removeACotarItem,
    updateACotarItemQuantity,
    updateSupplierCost,
    updateItemMarkup,
    updateItemField,
    updateMeasurement,
    clearItemForm,
  };
}
