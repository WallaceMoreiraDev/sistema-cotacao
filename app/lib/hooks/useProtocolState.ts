import { useState, useCallback } from 'react';
import type { ProtocolItem, StockProduct } from '../types/database';
import { areItemsMatching } from '../utils/protocolFormatters';
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
      .filter(i => (i.code || i.oem || i.name) === identifier)
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

    const match = findStockMatch(stockProducts, itemForm.name, measurements, itemForm.brand);
    const identifier = match ? (match.code || match.sku || match.name) : '';
    const availableStock = match ? getFreeStock(identifier, stockProducts) : 0;

    let newCounter = itemCounter;

    if (!itemForm.ignoreStock && match && availableStock > 0) {
      const stockQty = Math.min(qty, availableStock);
      const remainQty = qty - stockQty;

      newCounter++;
      const stockItem: ProtocolItem = {
        id: `item-${Date.now()}-e`,
        name: itemForm.name,
        quantity: stockQty,
        unitPrice: match.costPrice,
        costPrice: match.costPrice,
        type: 'estoque',
        status: 'pendente',
        oem: itemForm.oem || match.sku || undefined,
        nickname: itemForm.nickname || undefined,
        code: match.code || itemForm.code || undefined,
        brand: itemForm.brand || match.brand || undefined,
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
          name: itemForm.name,
          quantity: remainQty,
          unitPrice: 0,
          type: 'a_cotar',
          status: 'pendente',
          oem: itemForm.oem || undefined,
          nickname: itemForm.nickname || undefined,
          code: itemForm.code || undefined,
          brand: itemForm.brand || undefined,
          measurements,
          supplierPrices: {},
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
        name: itemForm.name,
        quantity: qty,
        unitPrice: 0,
        type: 'a_cotar',
        status: 'pendente',
        oem: itemForm.oem || undefined,
        nickname: itemForm.nickname || undefined,
        code: itemForm.code || undefined,
        brand: itemForm.brand || undefined,
        measurements,
        supplierPrices: {},
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

  const handleReallocate = useCallback((id: string, maxQty: number, stockProducts: StockProduct[]) => {
    const targetItem = aCotarItems.find(i => i.id === id);
    if (!targetItem) return;

    const currentQty = Number(targetItem.quantity);
    const qtyToMove = Math.min(currentQty, maxQty);

    const identifier = targetItem.code || targetItem.oem || targetItem.name;
    const product = stockProducts.find(p => (p.code || p.sku || p.name) === identifier);
    const costPrice = product ? product.costPrice : 0;

    const newEstoqueItem: ProtocolItem = {
      ...targetItem,
      id: `item-${Date.now()}-${Math.random()}`,
      type: 'estoque',
      quantity: qtyToMove,
      supplierPrices: {},
      chosenSupplier: undefined,
      chosenSupplierType: undefined,
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
        supplierPrices: {},
        chosenSupplier: undefined,
        chosenSupplierType: undefined,
        markupPercent: undefined,
        salePrice: 0,
        unitPrice: 0,
        costPrice: 0,
        needsApproval: false,
      };

      const existingIdx = cotarPrev.findIndex(i => areItemsMatching(i, quotedItem));
      if (existingIdx >= 0) {
        const updated = [...cotarPrev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: Number(updated[existingIdx].quantity) + excessQty };
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
          supplierPrices: {},
          chosenSupplier: undefined,
          chosenSupplierType: undefined,
          markupPercent: undefined,
          salePrice: 0,
          unitPrice: 0,
          costPrice: 0,
          needsApproval: false,
        };

        const existingIdx = updatedCotar.findIndex(i => areItemsMatching(i, quotedItem));
        if (existingIdx >= 0) {
          updatedCotar[existingIdx] = { 
            ...updatedCotar[existingIdx], 
            quantity: Number(updatedCotar[existingIdx].quantity) + split.excessQty 
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

  const updateSupplierPrice = useCallback((itemId: string, supplierId: string, value: string) => {
    const numVal = parseFloat(value.replace(',', '.')) || 0;
    setACotarItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        const newPrices = { ...item.supplierPrices, [supplierId]: numVal };
        const filledSuppliers = Object.entries(newPrices).filter(([, price]) => price > 0);
        let chosen: string | undefined;
        let chosenType: 'Mercado Local' | 'Fornecedor Original' | undefined;
        let lowestPrice = Infinity;
        for (const [sid, price] of filledSuppliers) {
          if (price < lowestPrice) {
            lowestPrice = price;
            chosen = sid;
            const supplier = suppliers.find(s => s.id === sid);
            chosenType = supplier?.type;
          }
        }
        const defaultMk = chosenType ? getDefaultMarkup(chosenType) : undefined;
        
        let currentMarkup = item.markupPercent;
        
        // Se o fornecedor vencedor mudou, ou se não tinha markup antes, volta pro padrão do vencedor
        if (chosen !== item.chosenSupplier || currentMarkup === undefined || currentMarkup === null) {
          currentMarkup = defaultMk;
        }

        const finalMarkup = currentMarkup ?? 0;
        const salePrice = lowestPrice === Infinity ? 0 : lowestPrice * (1 + finalMarkup / 100);
        const needsApproval = defaultMk !== undefined && currentMarkup !== undefined && currentMarkup !== defaultMk;

        let approvalStatus = item.approvalStatus;
        if (currentMarkup !== item.markupPercent) {
          approvalStatus = 'pending';
        }

        return {
          ...item,
          supplierPrices: newPrices,
          chosenSupplier: chosen,
          chosenSupplierType: chosenType,
          markupPercent: currentMarkup,
          salePrice,
          needsApproval,
          approvalStatus,
          unitPrice: lowestPrice === Infinity ? 0 : lowestPrice,
        };
      })
    );
  }, [suppliers]);

  const updateItemMarkup = useCallback((itemId: string, value: string) => {
    const numVal = parseFloat(value) || 0;
    setACotarItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        const supplierType = item.chosenSupplierType;
        const defaultMk = supplierType ? getDefaultMarkup(supplierType) : 0;
        const needsApproval = numVal !== defaultMk;
        const basePrice = item.unitPrice ?? 0;
        const salePrice = basePrice * (1 + numVal / 100);
        
        let approvalStatus = item.approvalStatus;
        if (numVal !== item.markupPercent) {
          approvalStatus = 'pending';
        }

        return { ...item, markupPercent: numVal, salePrice, needsApproval, approvalStatus };
      })
    );
  }, []);

  const updateItemField = useCallback((field: keyof ItemFormState, value: string) => {
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
    handleReallocate,
    removeEstoqueItem,
    updateEstoqueItemQuantity,
    splitEstoqueItem,
    splitMultipleEstoqueItems,
    removeACotarItem,
    updateACotarItemQuantity,
    updateSupplierPrice,
    updateItemMarkup,
    updateItemField,
    updateMeasurement,
  };
}
