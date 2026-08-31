import { useState, useCallback, useEffect, useRef } from 'react';
import type { ProtocolItem, StockProduct } from '../types/database';
import { areItemsMatching, formatMeasurement } from '../utils/protocolFormatters';
import { buildSmartDescription, generateFMCode } from '../utils/productNameBuilder';
import { ItemFormState, EMPTY_ITEM_FORM } from '../config/protocolForm';
import { findStockMatch } from '../services/stockService';
import { getDefaultMarkup } from '../config/suppliers';
import type { SupplierRow } from '../actions/suppliers';

export function getItemIdentifier(item: any): string {
  if (!item) return '';
  return item.code || item.sku || item.name || '';
}

export function useProtocolState(
  initialEstoque: ProtocolItem[] = [],
  initialCotar: ProtocolItem[] = [],
  suppliers: any[] = [],
  userRole?: string,
  initialSupplierFreights: Record<string, number> = {}
) {
  const [estoqueItems, setEstoqueItems] = useState<ProtocolItem[]>(initialEstoque);
  const [aCotarItems, setACotarItems] = useState<ProtocolItem[]>(initialCotar);
  const [itemForm, setItemForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);
  const [supplierFreights, setSupplierFreights] = useState<Record<string, number>>(initialSupplierFreights);

  const [itemCounter, setItemCounter] = useState(0);

  const updateSupplierFreight = useCallback((supplierId: string, cost: number) => {
    setSupplierFreights(prev => ({ ...prev, [supplierId]: cost }));
  }, []);

  const getFreeStock = useCallback((identifier: string, stockProducts: StockProduct[]) => {
    const product = stockProducts.find(p => getItemIdentifier(p) === identifier);
    if (!product) return 0;

    let available = product.stock;
    const localConsumed = estoqueItems
      .filter(i => getItemIdentifier(i) === identifier)
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
    const identifier = match ? getItemIdentifier(match) : '';
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
          costPrice: match.costPrice,
          productId: match.id,
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
        costPrice: (!itemForm.ignoreStock && match) ? match.costPrice : undefined,
        productId: match ? match.id : undefined,
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
    const identifier = getItemIdentifier(match);
    const availableStock = getFreeStock(identifier, [match]);

    let newCounter = itemCounter;

    if (!ignoreStock && availableStock > 0) {
      const stockQty = Math.min(qty, availableStock);
      const remainQty = qty - stockQty;

      newCounter++;
      const stockItem: ProtocolItem = {
        id: `item-${Date.now()}-e`,
        name: match.name || match.category || 'N/A',
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
          name: match.name || match.category || 'N/A',
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
          productId: match.id,
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
        .filter(i => getItemIdentifier(i) === identifier)
        .reduce((sum, i) => sum + Number(i.quantity), 0);
      const isMisto = localConsumed > 0 && !ignoreStock;

      const quotedItem: ProtocolItem = {
        id: `item-${Date.now()}-c`,
        name: match.name || match.category || 'N/A',
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
        productId: match.id,
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
      category: itemForm.category || undefined,
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

    const identifier = getItemIdentifier(targetItem);
    const product = stockProducts.find(p => getItemIdentifier(p) === identifier);
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

  const handleUpdateItem = useCallback((itemId: string, updatedFields: Partial<ProtocolItem>) => {
    setACotarItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, ...updatedFields };
      }
      return item;
    }));
    setEstoqueItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, ...updatedFields };
      }
      return item;
    }));
  }, []);

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

  // Sincroniza o destravamento caso os itens do estoque sejam apagados
  useEffect(() => {
    setACotarItems(prev => {
      let changed = false;
      const next = prev.map(cotarItem => {
        if (cotarItem.costPrice !== undefined) {
          const identifier = getItemIdentifier(cotarItem);
          const stillHasStock = estoqueItems.some(i => getItemIdentifier(i) === identifier);
          
          if (!stillHasStock) {
            changed = true;
            
            const newCosts = { ...(cotarItem.supplierCosts || {}) };
            const validEntries = Object.entries(newCosts).filter(([_, v]) => v > 0);
            let cheapestSupplierId: string | null = null;
            let baseCost = 0;
            
            if (validEntries.length > 0) {
              const cheapest = validEntries.reduce((min, current) => current[1] < min[1] ? current : min);
              cheapestSupplierId = cheapest[0];
              baseCost = cheapest[1];
            }

            let supplierType: 'Fornecedor Original' | 'Mercado Local' = 'Fornecedor Original';
            if (cheapestSupplierId) {
              const sup = suppliers.find(s => String(s.id) === cheapestSupplierId);
              if (sup && (sup.type === 'Fornecedor Original' || sup.type === 'Mercado Local')) {
                supplierType = sup.type;
              }
            }

            const defaultMk = getDefaultMarkup(supplierType);
            const mk = cotarItem.markupPercent !== undefined && cotarItem.markupPercent !== null ? cotarItem.markupPercent : defaultMk;
            const salePrice = baseCost * (1 + mk / 100);

            return {
              ...cotarItem,
              costPrice: undefined, // Destrava o item
              unitPrice: baseCost,
              salePrice,
              markupPercent: mk,
              needsApproval: mk < defaultMk
            };
          }
        }
        return cotarItem;
      });
      return changed ? next : prev;
    });
  }, [estoqueItems, suppliers]);

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
        let activeSupplierId: string | null = null;
        let baseCost = 0;
        
        if (validEntries.length > 0) {
          if (item.forcedSupplierId && newCosts[item.forcedSupplierId]) {
            // Respect forced supplier
            activeSupplierId = item.forcedSupplierId;
            baseCost = newCosts[activeSupplierId];
          } else {
            // Find cheapest
            const cheapest = validEntries.reduce((min, current) => current[1] < min[1] ? current : min);
            activeSupplierId = cheapest[0];
            baseCost = cheapest[1];
          }
        }

        if (hasStockCost) {
          baseCost = item.costPrice!;
        }

        let supplierType: 'Fornecedor Original' | 'Mercado Local' = 'Fornecedor Original'; // Fallback
        if (!hasStockCost && activeSupplierId) {
          const sup = suppliers.find(s => String(s.id) === activeSupplierId);
          if (sup && (sup.type === 'Fornecedor Original' || sup.type === 'Mercado Local')) {
            supplierType = sup.type;
          }
        }

        const defaultMk = getDefaultMarkup(supplierType);
        
        // Se tem custo de estoque (misto), NÃO mudamos o markup por causa de fornecedor.
        const winnerChanged = !hasStockCost && activeSupplierId && item.supplierId !== activeSupplierId;
        const mk = winnerChanged ? defaultMk : (item.markupPercent !== undefined && item.markupPercent !== null ? item.markupPercent : defaultMk);
        
        const salePrice = baseCost * (1 + mk / 100);
        
        // Recalculate approvalStatus 
        // ADMIN BYPASS: if user is admin, markup deviations do not require approval
        const isAdmin = userRole === 'admin';
        const needsApproval = isAdmin ? false : (mk !== defaultMk);
        let approvalStatus = item.approvalStatus;
        if (winnerChanged || mk !== item.markupPercent || isAdmin) {
          approvalStatus = needsApproval ? 'pending' : 'approved';
        }

        // Se for misto, não marcamos markup sujo ao mudar fornecedor (só suja se mexer direto no input de markup)
        const stateChanged = winnerChanged || mk !== item.markupPercent || approvalStatus !== item.approvalStatus;

        return { 
          ...item, 
          supplierCosts: newCosts, 
          supplierId: activeSupplierId || item.supplierId,
          unitPrice: baseCost, 
          markupPercent: mk,
          needsApproval,
          approvalStatus,
          isMarkupDirty: item.isMarkupDirty || stateChanged,
          salePrice 
        };
      })
    );
  }, [suppliers, userRole]);

  const forceItemSupplier = useCallback((itemId: string, supplierId: string | null) => {
    setACotarItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      const newForced = supplierId;
      let activeSupplierId: string | null = null;
      let baseCost = 0;
      
      const validEntries = Object.entries(item.supplierCosts || {}).filter(([_, v]) => v > 0);
      if (validEntries.length > 0) {
        if (newForced && (item.supplierCosts || {})[newForced]) {
          activeSupplierId = newForced;
          baseCost = (item.supplierCosts || {})[newForced];
        } else {
          const cheapest = validEntries.reduce((min, current) => current[1] < min[1] ? current : min);
          activeSupplierId = cheapest[0];
          baseCost = cheapest[1];
        }
      }

      const hasStockCost = (item.costPrice ?? 0) > 0;
      if (hasStockCost) {
        baseCost = item.costPrice!;
      }

      let supplierType: 'Fornecedor Original' | 'Mercado Local' = 'Fornecedor Original';
      if (!hasStockCost && activeSupplierId) {
        const sup = suppliers.find(s => String(s.id) === activeSupplierId);
        if (sup && (sup.type === 'Fornecedor Original' || sup.type === 'Mercado Local')) {
          supplierType = sup.type;
        }
      }

      const defaultMk = getDefaultMarkup(supplierType);
      const winnerChanged = !hasStockCost && activeSupplierId && item.supplierId !== activeSupplierId;
      const mk = winnerChanged ? defaultMk : (item.markupPercent !== undefined && item.markupPercent !== null ? item.markupPercent : defaultMk);
      
      const salePrice = baseCost * (1 + mk / 100);
      const isAdmin = userRole === 'admin';
      const needsApproval = isAdmin ? false : (mk !== defaultMk);
      let approvalStatus = item.approvalStatus;
      if (winnerChanged || mk !== item.markupPercent || isAdmin) {
        approvalStatus = needsApproval ? 'pending' : 'approved';
      }

      const stateChanged = winnerChanged || mk !== item.markupPercent || approvalStatus !== item.approvalStatus;

      return {
        ...item,
        forcedSupplierId: newForced || undefined,
        supplierId: activeSupplierId || item.supplierId,
        unitPrice: baseCost,
        markupPercent: mk,
        needsApproval,
        approvalStatus,
        isMarkupDirty: item.isMarkupDirty || stateChanged,
        salePrice
      };
    }));
  }, [suppliers, userRole]);

  const toggleExcludeFromPurchasing = useCallback((itemId: string) => {
    setACotarItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, excludeFromPurchasing: !item.excludeFromPurchasing } : item
    ));
  }, []);

  const updateItemMarkup = useCallback((itemId: string, value: string) => {
    const isReset = value.trim() === '';
    // Reject mid-typing states like '-', '.', '-.' that aren't valid numbers yet
    const parsed = parseFloat(value);
    if (!isReset && value.trim() !== '' && isNaN(parsed)) return;
    
    setACotarItems(prev => {
      const itemIdx = prev.findIndex(i => i.id === itemId);
      if (itemIdx === -1) return prev;
      const item = prev[itemIdx];

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
      const numVal = isReset ? defaultMk : parsed;

      // ANY deviation from the default requires manager approval — above OR below.
      // ADMIN BYPASS: if user is admin, they can set any markup without approval
      const isAdmin = userRole === 'admin';
      const needsApproval = isAdmin ? false : (numVal !== defaultMk);
      const approvalStatus: 'pending' | 'approved' | 'rejected' = needsApproval ? 'pending' : 'approved';
      
      let baseCost = item.unitPrice ?? 0;
      if (hasStockCost) {
        baseCost = item.costPrice!;
      }

      const salePrice = baseCost * (1 + numVal / 100);
      const isMarkupDirty = true;

      const updatedItem = { ...item, markupPercent: numVal, salePrice, unitPrice: baseCost, needsApproval, approvalStatus, isMarkupDirty };

      const newACotar = [...prev];
      newACotar[itemIdx] = updatedItem;
      return newACotar;
    });
  }, [suppliers, userRole]);

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

  // --- MOTOR GLOBAL DE PRECIFICAÇÃO DINÂMICA ---
  useEffect(() => {
    let cotarChanged = false;
    let estoqueChanged = false;

    // 1. Agrupar itens da cotação por fornecedor
    const supplierGroups: Record<string, ProtocolItem[]> = {};
    aCotarItems.forEach(item => {
      const supId = item.supplierId;
      if (supId) {
        if (!supplierGroups[supId]) supplierGroups[supId] = [];
        supplierGroups[supId].push(item);
      }
    });

    // 2. Recalcular A Cotar
    const newACotar = aCotarItems.map(item => {
      // Auto-trava: se este item não tem costPrice, mas existe um igual no Estoque, assume a trava!
      let currentCostPrice = item.costPrice;
      let currentProductId = item.productId;
      let changedByLock = false;
      if (!currentCostPrice || currentCostPrice <= 0) {
        const matchingEstoque = estoqueItems.find(est => areItemsMatching(est, item) && (est.costPrice ?? 0) > 0);
        if (matchingEstoque) {
          currentCostPrice = matchingEstoque.costPrice;
          currentProductId = matchingEstoque.productId;
          changedByLock = true;
        }
      }

      const supId = item.supplierId;
      const baseCost = item.unitPrice ?? 0;
      const mk = item.markupPercent ?? 70;
      const precoVendaBase = baseCost * (1 + mk / 100);
      const subtotalBaseLinha = precoVendaBase * Number(item.quantity);
      const subtotalComImposto = subtotalBaseLinha * 1.045; // Imposto 4.5%
      const taxAmount = subtotalComImposto - subtotalBaseLinha;

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
        
        // Item misto (travado pelo estoque) não repassa o frete pro cliente no preço final
        const isLockedByStock = (currentCostPrice ?? 0) > 0;
        if (!isLockedByStock) {
          totalFinalVenda += rateioFrete;
        }
      }

      const sp = totalFinalVenda / Number(item.quantity);

      if (
        changedByLock ||
        Math.abs((item.salePrice ?? 0) - sp) > 0.001 ||
        Math.abs((item.baseSubtotal ?? 0) - subtotalBaseLinha) > 0.001 ||
        Math.abs((item.taxAmount ?? 0) - taxAmount) > 0.001 ||
        Math.abs((item.freightAmount ?? 0) - rateioFrete) > 0.001 ||
        Math.abs((item.finalTotal ?? 0) - totalFinalVenda) > 0.001
      ) {
        cotarChanged = true;
        return { 
          ...item, 
          costPrice: currentCostPrice,
          productId: currentProductId,
          salePrice: sp,
          baseSubtotal: subtotalBaseLinha,
          taxAmount,
          freightAmount: rateioFrete,
          finalTotal: totalFinalVenda
        };
      }
      return item;
    });

    // 3. Recalcular Estoque
    const newEstoque = estoqueItems.map(est => {
      // Procurar se ele está amarrado a um item Misto na cotação para espelhar o preço final
      const linkedACotar = newACotar.find(ac => (ac.costPrice ?? 0) > 0 && (
         (ac.productId && ac.productId === est.productId) || areItemsMatching(est, ac)
      ));
      
      if (linkedACotar) {
        // Misto: espelha o PREÇO DE VENDA UNITÁRIO do item cotado, para não haver inconsistência na tela.
        const sp = linkedACotar.salePrice ?? 0;
        const subtotalComImposto = sp * Number(est.quantity);
        const subtotalBaseLinha = subtotalComImposto / 1.045; // Remove 4.5% para achar a base real (o frete foi absorvido como lucro na base)
        const taxAmount = subtotalComImposto - subtotalBaseLinha;
        
        // Mantemos o custo e markup visualmente iguais
        const baseCost = linkedACotar.unitPrice ?? 0;
        const mk = linkedACotar.markupPercent ?? 70;

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
      } else {
        // Item puro de estoque: recebe 4.5% de imposto mas não tem frete.
        const baseCost = est.unitPrice ?? 0;
        const mk = est.markupPercent ?? 70;
        const precoVendaBase = baseCost * (1 + mk / 100);
        const subtotalBaseLinha = precoVendaBase * Number(est.quantity);
        const subtotalComImposto = subtotalBaseLinha * 1.045; // Imposto 4.5%
        const taxAmount = subtotalComImposto - subtotalBaseLinha;
        const sp = subtotalComImposto / Number(est.quantity);
        
        if (
          Math.abs((est.salePrice ?? 0) - sp) > 0.001 ||
          Math.abs((est.baseSubtotal ?? 0) - subtotalBaseLinha) > 0.001 ||
          Math.abs((est.taxAmount ?? 0) - taxAmount) > 0.001 ||
          Math.abs((est.freightAmount ?? 0) - 0) > 0.001 ||
          Math.abs((est.finalTotal ?? 0) - subtotalComImposto) > 0.001
        ) {
          estoqueChanged = true;
          return { 
            ...est, 
            salePrice: sp,
            baseSubtotal: subtotalBaseLinha,
            taxAmount,
            freightAmount: 0,
            finalTotal: subtotalComImposto
          };
        }
      }
      return est;
    });

    if (cotarChanged) {
      setACotarItems(newACotar);
    }
    if (estoqueChanged) {
      setEstoqueItems(newEstoque);
    }

  }, [aCotarItems, estoqueItems, suppliers, supplierFreights]); // Dependências completas

  return {
    estoqueItems,
    setEstoqueItems,
    aCotarItems,
    setACotarItems,
    supplierFreights,
    setSupplierFreights,
    updateSupplierFreight,
    itemCounter,
    itemForm,
    setItemForm,
    addFeedback,
    clearItemForm,
    handleAddItem,
    handleAddStockItem,
    handleCreateNewItem,
    handleUpdateItem,
    getFreeStock,
    handleReallocate,
    removeEstoqueItem,
    updateEstoqueItemQuantity,
    splitEstoqueItem,
    splitMultipleEstoqueItems,
    removeACotarItem,
    updateACotarItemQuantity,
    updateSupplierCost,
    forceItemSupplier,
    toggleExcludeFromPurchasing,
    updateItemMarkup,
    updateItemField,
    updateMeasurement,
  };
}
