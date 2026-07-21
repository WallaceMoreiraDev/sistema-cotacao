'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createProtocol, calculateTotals } from '../../../lib/services/protocolService';
import { saveProtocolAction, getReservedStockAction } from '../../../lib/actions/protocols';
import { fetchStock, searchStock, findStockMatch, filterStockByForm } from '../../../lib/services/stockService';
import { SUPPLIERS, getSupplierById, getDefaultMarkup } from '../../../lib/config/suppliers';
import { getClientsAction, createClientAction } from '../../../lib/actions/clients';
import { getSealTypesAction } from '../../../lib/actions/sealTypes';
import type { Protocol, ProtocolItem, StockProduct, Client, SealType } from '../../../lib/types/database';

const AUTOSAVE_DELAY = 1500;

// ─── Measurement field definitions ───
const MEASUREMENT_FIELDS = [
  { key: 'innerDiameter', label: 'D. Interno', suffix: 'mm' },
  { key: 'outerDiameter', label: 'D. Externo', suffix: 'mm' },
  { key: 'height1', label: 'Altura 1', suffix: 'mm' },
  { key: 'height2', label: 'Altura 2', suffix: 'mm' },
  { key: 'thickness', label: 'Espessura', suffix: 'mm' },
  { key: 'cs', label: 'CS', suffix: 'mm' },
] as const;

type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]['key'];

// ─── Item form shape ───
interface ItemFormState {
  name: string;
  oem: string;
  nickname: string;
  code: string;
  quantity: string;
  measurements: Record<MeasurementKey, string>;
}

const EMPTY_ITEM_FORM: ItemFormState = {
  name: '',
  oem: '',
  nickname: '',
  code: '',
  quantity: '',
  measurements: {
    innerDiameter: '',
    outerDiameter: '',
    height1: '',
    height2: '',
    thickness: '',
    cs: '',
  },
};

// ─── Helpers ───
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}

function formatMeasurement(val: number | undefined): string {
  if (val === undefined || val === null) return '-';
  return `${val} mm`;
}

function areItemsMatching(
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

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════
export default function NewProtocolPage() {
  const router = useRouter();

  // ── Protocol header state ──
  const [clientName, setClientName] = useState('');
  const [clientCnpj, setClientCnpj] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [registeredClients, setRegisteredClients] = useState<Client[]>([]);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [protocolTitle, setProtocolTitle] = useState('');

  // ── Seal types state (Strict validation) ──
  const [registeredSealTypes, setRegisteredSealTypes] = useState<SealType[]>([]);
  const [isSealDropdownOpen, setIsSealDropdownOpen] = useState(false);

  // ── Stock state ──
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // ── Item form ──
  const [itemForm, setItemForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);

  // ── Protocol items ──
  const [estoqueItems, setEstoqueItems] = useState<ProtocolItem[]>([]);
  const [aCotarItems, setACotarItems] = useState<ProtocolItem[]>([]);
  const [itemCounter, setItemCounter] = useState(0);

  // ── Feedback ──
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  // ── Auto-save ──
  const protocolIdRef = useRef<string | number>(`proto-${Date.now()}`);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFinalizing = useRef(false); // Blocks auto-save during manual save/efetivar

  // ── Determine if form is unlocked ──
  const cleanCnpjDigits = clientCnpj.replace(/\D/g, '');
  const isFormUnlocked = isNewClient
    ? clientName.trim().length > 0 && cleanCnpjDigits.length === 14
    : clientName.trim().length > 0;

  // ════════════════════════════════════════════════════════════
  // LOAD STOCK, CLIENTS & SEAL TYPES FROM SUPABASE ON MOUNT
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    let cancelled = false;

    // Load Stock and Reservations concurrently
    Promise.all([fetchStock(), getReservedStockAction()]).then(([products, reservations]) => {
      if (!cancelled) {
        const realProducts = products.map(p => {
          const identifier = p.code || p.sku || p.name;
          const reserved = reservations[identifier] || 0;
          return {
            ...p,
            stock: Math.max(0, p.stock - reserved)
          };
        });
        setStockProducts(realProducts);
        setStockLoading(false);
      }
    });

    // Load Clients from Supabase
    getClientsAction().then((res) => {
      if (!cancelled && res.success && res.data) {
        setRegisteredClients(res.data);
      }
    });

    // Load Seal Types from Supabase
    getSealTypesAction().then((res) => {
      if (!cancelled && res.success && res.data) {
        setRegisteredSealTypes(res.data);
      }
    });

    return () => { cancelled = true; };
  }, []);



  // ════════════════════════════════════════════════════════════
  // AUTO-SAVE (debounced, triggers on item/client/title changes)
  // ════════════════════════════════════════════════════════════
  const allItems = useMemo(() => [...estoqueItems, ...aCotarItems], [estoqueItems, aCotarItems]);
  const totals = useMemo(() => calculateTotals(allItems), [allItems]);

  useEffect(() => {
    // Block auto-save if a manual save (Efetivar / Salvar Rascunho) is in progress
    if (isFinalizing.current) return;
    // Only save if there is at least some data
    if (!clientName.trim() && !protocolTitle.trim() && !itemForm.name.trim() && allItems.length === 0) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    setAutoSaveStatus('saving');
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const draftProtocol: Protocol = {
          id: protocolIdRef.current,
          clientName: clientName.trim() || 'Sem Cliente',
          clientCnpj: clientCnpj.trim() || undefined,
          isNewClient,
          title: protocolTitle.trim() || undefined,
          items: allItems,
          totals: { subtotal: totals.subtotal, markup: totals.markup, total: totals.total },
          status: 'draft',
          draftForm: itemForm,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const res = await saveProtocolAction(draftProtocol);
        if (res.success && res.data) {
          protocolIdRef.current = res.data.id;
        }

        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (e) {
        console.error('Error during auto-save:', e);
      }
    }, AUTOSAVE_DELAY);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [allItems, clientName, protocolTitle, totals, itemCounter, itemForm]);

  // ════════════════════════════════════════════════════════════
  // STOCK SEARCH (Dynamic filtering based on form inputs + search box)
  // ════════════════════════════════════════════════════════════
  const stockSearchResults = useMemo(() => {
    return filterStockByForm(stockProducts, stockSearchQuery, itemForm).slice(0, 10);
  }, [stockProducts, stockSearchQuery, itemForm]);

  const handleUseStockItem = useCallback((product: StockProduct) => {
    setItemForm((prev) => ({
      ...prev,
      name: product.name,
      code: product.code,
      oem: product.sku,
      measurements: {
        innerDiameter: product.measurements?.innerDiameter !== undefined ? String(product.measurements.innerDiameter) : prev.measurements.innerDiameter,
        outerDiameter: product.measurements?.outerDiameter !== undefined ? String(product.measurements.outerDiameter) : prev.measurements.outerDiameter,
        height1: product.measurements?.height1 !== undefined ? String(product.measurements.height1) : prev.measurements.height1,
        height2: product.measurements?.height2 !== undefined ? String(product.measurements.height2) : prev.measurements.height2,
        thickness: product.measurements?.thickness !== undefined ? String(product.measurements.thickness) : prev.measurements.thickness,
        cs: product.measurements?.cs !== undefined ? String(product.measurements.cs) : prev.measurements.cs,
      },
    }));
  }, []);

  // ════════════════════════════════════════════════════════════
  // ITEM FORM HANDLERS
  // ════════════════════════════════════════════════════════════
  const updateItemField = useCallback((field: keyof ItemFormState, value: string) => {
    setItemForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateMeasurement = useCallback((key: MeasurementKey, value: string) => {
    // Allow only numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    setItemForm((prev) => ({
      ...prev,
      measurements: { ...prev.measurements, [key]: cleaned },
    }));
  }, []);

  // ════════════════════════════════════════════════════════════
  // CLIENT & SEAL TYPE HELPERS
  // ════════════════════════════════════════════════════════════
  const filteredClients = useMemo(() => {
    if (!clientName.trim()) return registeredClients;
    return registeredClients.filter((c) =>
      c.name.toLowerCase().includes(clientName.trim().toLowerCase())
    );
  }, [registeredClients, clientName]);

  const handleSelectClient = useCallback((client: Client) => {
    setClientName(client.name);
    setClientCnpj(client.cnpj || '');
    setIsNewClient(false);
    setIsClientDropdownOpen(false);
  }, []);

  const handleClientBlur = useCallback(() => {
    setTimeout(() => {
      setIsClientDropdownOpen(false);
      if (!clientName.trim()) {
        setIsNewClient(false);
        return;
      }
      const match = registeredClients.find(
        (c) => c.name.toLowerCase() === clientName.trim().toLowerCase()
      );
      if (match) {
        setIsNewClient(false);
        if (match.cnpj) setClientCnpj(match.cnpj);
      } else {
        setIsNewClient(true);
      }
    }, 200);
  }, [clientName, registeredClients]);

  const formatCnpjMask = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  // Seal type filtering & strict validation
  const filteredSealTypes = useMemo(() => {
    if (!itemForm.name.trim()) return registeredSealTypes;
    return registeredSealTypes.filter((st) =>
      st.name.toLowerCase().includes(itemForm.name.trim().toLowerCase())
    );
  }, [registeredSealTypes, itemForm.name]);

  const isValidSealType = useMemo(() => {
    if (!itemForm.name.trim()) return false;
    return registeredSealTypes.some(
      (st) => st.name.toLowerCase() === itemForm.name.trim().toLowerCase()
    );
  }, [registeredSealTypes, itemForm.name]);

  // ── Validation ──
  const isItemFormValid = useMemo(() => {
    if (!isValidSealType) return false;
    const qty = parseFloat(itemForm.quantity);
    if (!qty || qty <= 0) return false;
    // All measurement fields must be filled
    return MEASUREMENT_FIELDS.every((f) => {
      const val = itemForm.measurements[f.key];
      return val !== '' && !isNaN(parseFloat(val));
    });
  }, [itemForm, isValidSealType]);

  // ════════════════════════════════════════════════════════════
  // ADD ITEM (Intelligent separation)
  // ════════════════════════════════════════════════════════════
  const handleAddItem = useCallback(() => {
    if (!isItemFormValid) return;

    const qty = parseFloat(itemForm.quantity);
    const measurements = {
      innerDiameter: parseFloat(itemForm.measurements.innerDiameter) || undefined,
      outerDiameter: parseFloat(itemForm.measurements.outerDiameter) || undefined,
      height1: parseFloat(itemForm.measurements.height1) || undefined,
      height2: parseFloat(itemForm.measurements.height2) || undefined,
      thickness: parseFloat(itemForm.measurements.thickness) || undefined,
      cs: parseFloat(itemForm.measurements.cs) || undefined,
    };

    // Find stock match
    const match = findStockMatch(stockProducts, itemForm.name, measurements);
    const availableStock = match ? match.stock : 0;

    let newCounter = itemCounter;

    if (match && availableStock > 0) {
      const stockQty = Math.min(qty, availableStock);
      const remainQty = qty - stockQty;

      // Stock item
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
        code: match.code || itemForm.code || undefined, // ← always use match.code so reservation lookup works
        measurements,
        stockQty: availableStock,
        productId: match.id,
        markupPercent: 70,
        salePrice: match.costPrice * 1.7,
      };
      setEstoqueItems((prev) => {
        const existingIdx = prev.findIndex((i) => areItemsMatching(i, stockItem));
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + stockQty,
          };
          return updated;
        }
        return [...prev, stockItem];
      });
      
      // Decrease stock locally to reflect in search
      setStockProducts((prev) => prev.map((p) => p.id === match.id ? { ...p, stock: p.stock - stockQty } : p));

      if (remainQty > 0) {
        // Remainder goes to "a cotar"
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
          measurements,
          supplierPrices: {},
          markupPercent: undefined,
          salePrice: 0,
        };

        setACotarItems((prev) => {
          const existingIdx = prev.findIndex((i) => areItemsMatching(i, quotedItem));
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = {
              ...updated[existingIdx],
              quantity: updated[existingIdx].quantity + remainQty,
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
      // No stock — everything to "a cotar"
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
        measurements,
        supplierPrices: {},
        markupPercent: undefined,
        salePrice: 0,
      };

      setACotarItems((prev) => {
        const existingIdx = prev.findIndex((i) => areItemsMatching(i, quotedItem));
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + qty,
          };
          return updated;
        }
        return [...prev, quotedItem];
      });

      setAddFeedback('Sem estoque disponível — item enviado para cotação');
    }

    setItemCounter(newCounter);
    setItemForm(EMPTY_ITEM_FORM);
    setStockSearchQuery('');

    // Clear feedback after 4s
    setTimeout(() => setAddFeedback(null), 4000);
  }, [isItemFormValid, itemForm, stockProducts, itemCounter]);

  // ════════════════════════════════════════════════════════════
  // SUPPLIER PRICE HANDLERS (Lista B)
  // ════════════════════════════════════════════════════════════
  const updateSupplierPrice = useCallback((itemId: string, supplierId: string, value: string) => {
    const numVal = parseFloat(value.replace(',', '.')) || 0;

    setACotarItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const newPrices = { ...item.supplierPrices, [supplierId]: numVal };

        // Find cheapest supplier
        const filledSuppliers = Object.entries(newPrices).filter(([, price]) => price > 0);
        let chosen: string | undefined;
        let chosenType: 'original' | 'local' | undefined;
        let lowestPrice = Infinity;

        for (const [sid, price] of filledSuppliers) {
          if (price < lowestPrice) {
            lowestPrice = price;
            chosen = sid;
            const supplier = getSupplierById(sid);
            chosenType = supplier?.type;
          }
        }

        // Calculate markup and sale price
        const defaultMk = chosenType ? getDefaultMarkup(chosenType) : undefined;
        const currentMarkup = item.markupPercent ?? defaultMk;
        const finalMarkup = currentMarkup ?? 0;
        const salePrice = lowestPrice === Infinity ? 0 : lowestPrice * (1 + finalMarkup / 100);
        const needsApproval =
          defaultMk !== undefined && currentMarkup !== undefined && currentMarkup !== defaultMk;

        return {
          ...item,
          supplierPrices: newPrices,
          chosenSupplier: chosen,
          chosenSupplierType: chosenType,
          markupPercent: currentMarkup ?? defaultMk,
          salePrice,
          needsApproval,
          unitPrice: lowestPrice === Infinity ? 0 : lowestPrice,
        };
      })
    );
  }, []);

  const updateItemMarkup = useCallback((itemId: string, value: string) => {
    const numVal = parseFloat(value) || 0;

    setACotarItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const supplierType = item.chosenSupplierType;
        const defaultMk = supplierType ? getDefaultMarkup(supplierType) : 0;
        const needsApproval = numVal !== defaultMk;

        const basePrice = item.unitPrice ?? 0;
        const salePrice = basePrice * (1 + numVal / 100);

        return {
          ...item,
          markupPercent: numVal,
          salePrice,
          needsApproval,
        };
      })
    );
  }, []);

  // ── Remove and Update items ──
  const removeEstoqueItem = useCallback((id: string) => {
    const itemToRemove = estoqueItems.find((i) => i.id === id);
    if (itemToRemove && itemToRemove.productId) {
      setStockProducts((stocks) =>
        stocks.map((s) => (s.id === itemToRemove.productId ? { ...s, stock: s.stock + itemToRemove.quantity } : s))
      );
    }
    setEstoqueItems((prev) => prev.filter((i) => i.id !== id));
  }, [estoqueItems]);

  const updateEstoqueItemQuantity = useCallback((id: string, newQty: number) => {
    if (newQty < 1 || isNaN(newQty)) return;
    const item = estoqueItems.find((i) => i.id === id);
    if (!item || !item.productId) return;
    
    const diff = newQty - item.quantity;
    if (diff === 0) return;

    const stockProduct = stockProducts.find((s) => s.id === item.productId);
    if (!stockProduct) return;

    const maxQty = item.quantity + stockProduct.stock;
    const finalQty = Math.min(newQty, maxQty);
    const actualDiff = finalQty - item.quantity;

    if (actualDiff === 0) return;

    setStockProducts((stocks) =>
      stocks.map((s) => (s.id === item.productId ? { ...s, stock: s.stock - actualDiff } : s))
    );

    setEstoqueItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: finalQty } : i))
    );
  }, [estoqueItems, stockProducts]);

  const removeACotarItem = useCallback((id: string) => {
    setACotarItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateACotarItemQuantity = useCallback((id: string, newQty: number) => {
    if (newQty < 1 || isNaN(newQty)) return;
    setACotarItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i))
    );
  }, []);


  // ════════════════════════════════════════════════════════════
  // FINALIZE PROTOCOL
  // ════════════════════════════════════════════════════════════
  const canFinalize = allItems.length > 0 && clientName.trim().length > 0;

  const handleSaveDraft = useCallback(async () => {
    if (!canFinalize) return;

    // Block auto-save and cancel any pending timer
    isFinalizing.current = true;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    if (isNewClient && clientCnpj.trim()) {
      createClientAction({ name: clientName.trim(), cnpj: clientCnpj.trim() }).catch(console.error);
    }

    const protocol = createProtocol({
      id: protocolIdRef.current,
      clientName: clientName.trim(),
      clientCnpj: clientCnpj.trim() || undefined,
      isNewClient,
      title: protocolTitle.trim() || undefined,
      items: [...estoqueItems, ...aCotarItems],
      totals: { subtotal: totals.subtotal, markup: totals.markup, total: totals.total },
      status: 'draft',
    });

    await saveProtocolAction(protocol);
    router.push('/dashboard');
  }, [canFinalize, clientName, clientCnpj, isNewClient, protocolTitle, estoqueItems, aCotarItems, totals, router]);

  const handleEfetivar = useCallback(async () => {
    if (!canFinalize) return;

    // Block auto-save and cancel any pending timer
    isFinalizing.current = true;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    if (isNewClient && clientCnpj.trim()) {
      createClientAction({ name: clientName.trim(), cnpj: clientCnpj.trim() }).catch(console.error);
    }

    // 1. Fetch fresh stock and reservations
    const [products, reservations] = await Promise.all([fetchStock(), getReservedStockAction()]);
    
    // 2. Compute available stock
    const availableStock: Record<string, number> = {};
    for (const p of products) {
      const identifier = p.code || p.sku || p.name;
      const reserved = reservations[identifier] || 0;
      availableStock[identifier] = Math.max(0, p.stock - reserved);
    }

    // 3. Re-evaluate `estoqueItems`
    let finalEstoqueItems: ProtocolItem[] = [];
    let finalACotarItems: ProtocolItem[] = [...aCotarItems];

    for (const item of estoqueItems) {
      const identifier = item.code || item.oem || item.name;
      const available = availableStock[identifier] || 0;

      if (item.quantity <= available) {
        // We have enough stock
        finalEstoqueItems.push(item);
        // Decrease locally in our map for next items
        availableStock[identifier] = available - item.quantity;
      } else {
        // Not enough stock, we must split
        const stockQty = available;
        const missingQty = item.quantity - available;

        if (stockQty > 0) {
          finalEstoqueItems.push({
            ...item,
            id: `item-${Date.now()}-${Math.random()}`,
            quantity: stockQty
          });
          availableStock[identifier] = 0;
        }

        if (missingQty > 0) {
          // Check if we already have this item in `aCotarItems`
          const existingCotar = finalACotarItems.find(i => i.name === item.name && i.code === item.code);
          if (existingCotar) {
            existingCotar.quantity += missingQty;
          } else {
            finalACotarItems.push({
              ...item,
              id: `item-${Date.now()}-${Math.random()}`,
              quantity: missingQty,
              type: 'a_cotar'
            });
          }
        }
      }
    }

    setEstoqueItems(finalEstoqueItems);
    setACotarItems(finalACotarItems);

    const totalsObj = calculateTotals([...finalEstoqueItems, ...finalACotarItems]);

    const protocol = createProtocol({
      id: protocolIdRef.current,
      clientName: clientName.trim(),
      clientCnpj: clientCnpj.trim() || undefined,
      isNewClient,
      title: protocolTitle.trim() || undefined,
      items: [...finalEstoqueItems, ...finalACotarItems],
      totals: { subtotal: totalsObj.subtotal, markup: totalsObj.markup, total: totalsObj.total },
      status: 'in_progress',
    });

    await saveProtocolAction(protocol);
    router.push('/dashboard');
  }, [canFinalize, clientName, clientCnpj, isNewClient, protocolTitle, estoqueItems, aCotarItems, router]);

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <section className="space-y-5">
      {/* ──── BREADCRUMB ──── */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard" className="hover:text-slate-900 transition">Dashboard</Link>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="font-semibold text-slate-800">Novo Protocolo</span>
      </nav>

      {/* ──── HEADER CARD ──── */}
      <div className="rounded-[24px] border border-slate-200/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#F7C00C] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-950">
                Novo Protocolo
              </span>
              {/* Auto-save indicator */}
              {autoSaveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400 animate-pulse">
                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Salvando...
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Salvo automaticamente
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Client Name with Autocomplete */}
              <div className="relative">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Nome do Cliente *</span>
                  {isNewClient ? (
                    <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[9px]">Novo Cliente</span>
                  ) : clientName.trim() ? (
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[9px]">Cliente Cadastrado</span>
                  ) : null}
                </label>
                <input
                  type="text"
                  value={clientName}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    setIsClientDropdownOpen(true);
                  }}
                  onBlur={handleClientBlur}
                  placeholder="Digite para buscar ou cadastrar..."
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm font-medium text-white bg-white/5 placeholder-slate-500 outline-none transition ${
                    clientName.trim() ? 'border-slate-600 focus:border-[#F7C00C]' : 'border-amber-500/60 ring-1 ring-amber-500/20'
                  }`}
                />

                {/* Autocomplete Dropdown */}
                {isClientDropdownOpen && filteredClients.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl">
                    <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Clientes Cadastrados</p>
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onMouseDown={() => handleSelectClient(client)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
                      >
                        <span className="font-semibold">{client.name}</span>
                        {client.cnpj && <span className="text-[10px] font-mono text-slate-400">{client.cnpj}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {!clientName.trim() && (
                  <p className="mt-1 text-[10px] text-amber-400">Obrigatório para liberar o formulário de itens</p>
                )}
              </div>

              {/* Conditional CNPJ Input for New Clients OR Protocol Title */}
              {isNewClient ? (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1.5">
                    CNPJ do Novo Cliente *
                  </label>
                  <input
                    type="text"
                    value={clientCnpj}
                    onChange={(e) => setClientCnpj(formatCnpjMask(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm font-medium text-white bg-white/5 placeholder-slate-500 outline-none transition ${
                      cleanCnpjDigits.length === 14 ? 'border-emerald-500/80 focus:border-emerald-400' : 'border-amber-500/80 ring-1 ring-amber-500/20 focus:border-amber-400'
                    }`}
                  />
                  {cleanCnpjDigits.length < 14 && (
                    <p className="mt-1 text-[10px] text-amber-400">Preencha o CNPJ completo para destravar o formulário</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Título (Opcional)</span>
                    <span className="rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 px-2 py-0.5 text-[9px] uppercase tracking-wider">Rascunho</span>
                  </label>
                  <input
                    type="text"
                    value={protocolTitle}
                    onChange={(e) => setProtocolTitle(e.target.value)}
                    placeholder="Ex: Cotação urgente cilindro..."
                    className="w-full rounded-xl border border-slate-600 bg-white/5 px-4 py-2.5 text-sm font-medium text-white placeholder-slate-500 outline-none transition focus:border-slate-400"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ──── STOCK LOADING ──── */}
      {stockLoading && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 animate-spin text-[#F7C00C]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-slate-800">Carregando estoque...</p>
              <p className="text-xs text-slate-500">Consultando base de dados para referência local</p>
            </div>
          </div>
        </div>
      )}

      {/* ──── ITEM FORM + STOCK SEARCH ──── */}
      {!stockLoading && (
        <div className="relative">
          {/* Overlay when form is locked */}
          {!isFormUnlocked && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-[2px]">
              <div className="text-center">
                <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="mt-2 text-sm font-semibold text-slate-600">Preencha o nome do cliente para começar</p>
              </div>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            {/* ── Form ── */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Adicionar Item</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                  {allItems.length} {allItems.length === 1 ? 'item' : 'itens'} adicionados
                </span>
              </div>

              {/* Row 1: Name, OEM, Nickname, Code, Qty */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {/* Seal Type Input with Strict Autocomplete */}
                <div className="col-span-2 sm:col-span-1 relative">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                    <span>Nome / Tipo *</span>
                    {itemForm.name.trim() && !isValidSealType && (
                      <span className="text-[9px] text-red-500 font-normal">Inválido</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onFocus={() => setIsSealDropdownOpen(true)}
                    onChange={(e) => {
                      updateItemField('name', e.target.value);
                      setIsSealDropdownOpen(true);
                    }}
                    onBlur={() => setTimeout(() => setIsSealDropdownOpen(false), 200)}
                    placeholder="Selecione um tipo..."
                    className={`w-full rounded-lg border px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition ${
                      itemForm.name.trim() && !isValidSealType
                        ? 'border-red-300 bg-red-50/50 focus:border-red-500'
                        : 'border-slate-200 bg-slate-50 focus:border-slate-400 focus:bg-white'
                    }`}
                  />

                  {/* Seal Types Dropdown */}
                  {isSealDropdownOpen && filteredSealTypes.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                      <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Vedações Cadastradas (Supabase)</p>
                      {filteredSealTypes.map((sealType) => (
                        <button
                          key={sealType.id}
                          type="button"
                          onMouseDown={() => {
                            updateItemField('name', sealType.name);
                            setIsSealDropdownOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                          <span className="font-semibold">{sealType.name}</span>
                          {sealType.category && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">{sealType.category}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {itemForm.name.trim() && !isValidSealType && (
                    <p className="mt-1 text-[9px] text-red-500 leading-tight">Selecione um tipo válido da lista acima</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Ref. / Cód. OEM</label>
                  <input
                    type="text"
                    value={itemForm.oem}
                    onChange={(e) => updateItemField('oem', e.target.value)}
                    placeholder="GX-001"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Apelido / Perfil</label>
                  <input
                    type="text"
                    value={itemForm.nickname}
                    onChange={(e) => updateItemField('nickname', e.target.value)}
                    placeholder="Gaxeta"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Código</label>
                  <input
                    type="text"
                    value={itemForm.code}
                    onChange={(e) => updateItemField('code', e.target.value)}
                    placeholder="GX-50x65x10"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Quantidade *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={itemForm.quantity}
                    onChange={(e) => updateItemField('quantity', e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Measurements */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Medidas (mm) *</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {MEASUREMENT_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="block text-[9px] font-medium text-slate-400 mb-0.5">{field.label}</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={itemForm.measurements[field.key]}
                          onChange={(e) => updateMeasurement(field.key, e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 pr-8 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">{field.suffix}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Button + Feedback */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!isItemFormValid || !isFormUnlocked}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#F7C00C] px-5 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition-all hover:bg-[#E8B600] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar Item
                </button>

                {addFeedback && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-[11px] font-medium text-blue-700 animate-in slide-in-from-left-2">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {addFeedback}
                  </span>
                )}
              </div>
            </div>

            {/* ── Stock Search Sidebar ── */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Busca no Estoque</h3>
                <span className="text-[9px] text-slate-400">Filtrando pelos campos</span>
              </div>
              <input
                type="text"
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                placeholder="Busca rápida ou digite nos campos..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white mb-3"
              />

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {stockSearchResults.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-4 leading-relaxed">
                    Preencha Nome, Código ou Medidas nos campos do formulário para encontrar itens em estoque.
                  </p>
                )}
                {stockSearchResults.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition hover:border-slate-300 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{product.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{product.code} · {product.sku}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        product.stock > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {product.stock > 0 ? `${product.stock} un.` : 'Sem estoque'}
                      </span>
                    </div>

                    {product.measurements && (
                      <div className="flex flex-wrap gap-1">
                        {product.measurements.innerDiameter && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">DI: {product.measurements.innerDiameter}mm</span>
                        )}
                        {product.measurements.outerDiameter && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">DE: {product.measurements.outerDiameter}mm</span>
                        )}
                        {product.measurements.height1 && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">A1: {product.measurements.height1}mm</span>
                        )}
                        {product.measurements.cs && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">CS: {product.measurements.cs}mm</span>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleUseStockItem(product)}
                      className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900/5 hover:bg-slate-900 hover:text-white px-2 py-1 text-[10px] font-bold text-slate-700 transition"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Preencher Formulário
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──── LISTA A: ITENS EM ESTOQUE ──── */}
      {estoqueItems.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200/80 bg-emerald-50/50 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Itens em Estoque</h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
              {estoqueItems.length} {estoqueItems.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">#</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Nome</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Código</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">D.Int</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">D.Ext</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">A1</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">Qtd</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-right">Custo</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">
                    <span className="inline-flex items-center gap-1">
                      Markup
                      <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </span>
                  </th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-right">Preço Venda</th>
                  <th className="px-4 py-2.5 text-[10px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {estoqueItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                    <td className="px-4 py-3 text-slate-500">{item.code || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatMeasurement(item.measurements?.innerDiameter)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatMeasurement(item.measurements?.outerDiameter)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatMeasurement(item.measurements?.height1)}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateEstoqueItemQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-center text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-400"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.costPrice ?? 0)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        70%
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency((item.costPrice ?? 0) * 1.7 * item.quantity)}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => removeEstoqueItem(item.id)} className="text-slate-400 hover:text-red-500 transition">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──── LISTA B: ITENS A SEREM COTADOS ──── */}
      {aCotarItems.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200/80 bg-amber-50/50 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Itens a Serem Cotados</h2>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
              {aCotarItems.length} {aCotarItems.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">#</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Nome</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Código</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">D.Int</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">D.Ext</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">Qtd</th>
                  {/* Supplier columns */}
                  {SUPPLIERS.map((s) => (
                    <th key={s.id} className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">
                      <div className="flex flex-col items-center">
                        <span>{s.name}</span>
                        <span className="text-[8px] font-normal text-slate-400 normal-case">
                          {s.type === 'original' ? 'Fornecedor Original' : 'Mercado Local'}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">Escolhido</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">Markup %</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-right">Preço Venda</th>
                  <th className="px-3 py-2.5 text-[10px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aCotarItems.map((item, idx) => {
                  const defaultMk = item.chosenSupplierType ? getDefaultMarkup(item.chosenSupplierType) : null;
                  const isCustomMarkup = item.needsApproval === true;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-3 py-3 font-mono font-bold text-slate-400">{estoqueItems.length + idx + 1}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800">{item.name}</td>
                      <td className="px-3 py-3 text-slate-500">{item.code || '-'}</td>
                      <td className="px-3 py-3 text-slate-500">{formatMeasurement(item.measurements?.innerDiameter)}</td>
                      <td className="px-3 py-3 text-slate-500">{formatMeasurement(item.measurements?.outerDiameter)}</td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateACotarItemQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-16 rounded border border-slate-200 px-2 py-1 text-center text-xs font-semibold text-slate-800 outline-none transition focus:border-amber-400"
                        />
                      </td>
                      {/* Supplier price inputs */}
                      {SUPPLIERS.map((s) => {
                        const isChosen = item.chosenSupplier === s.id;
                        return (
                          <td key={s.id} className="px-2 py-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.supplierPrices?.[s.id] || ''}
                              onChange={(e) => updateSupplierPrice(item.id, s.id, e.target.value)}
                              placeholder="R$"
                              className={`w-full rounded-lg border px-2 py-1.5 text-xs text-center outline-none transition ${
                                isChosen
                                  ? 'border-emerald-300 bg-emerald-50 font-bold text-emerald-800 ring-1 ring-emerald-200'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400 focus:bg-white'
                              }`}
                            />
                          </td>
                        );
                      })}
                      {/* Chosen supplier */}
                      <td className="px-3 py-3 text-center">
                        {item.chosenSupplier ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            {getSupplierById(item.chosenSupplier)?.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      {/* Markup */}
                      <td className="px-2 py-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="999"
                            step="1"
                            value={item.markupPercent ?? ''}
                            onChange={(e) => updateItemMarkup(item.id, e.target.value)}
                            disabled={!item.chosenSupplier}
                            className={`w-full rounded-lg border px-2 py-1.5 pr-6 text-xs text-center outline-none transition ${
                              isCustomMarkup
                                ? 'border-amber-300 bg-amber-50/80 text-amber-800 ring-1 ring-amber-200'
                                : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400 focus:bg-white'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                          {/* Info tooltip for custom markup */}
                          {isCustomMarkup && (
                            <div className="group absolute -top-1 -right-1">
                              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white cursor-help">
                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              </div>
                              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-20">
                                <div className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] text-white shadow-lg whitespace-nowrap">
                                  <p className="font-bold">Markup personalizado</p>
                                  <p className="mt-0.5 text-slate-300">
                                    Padrão para {item.chosenSupplierType === 'original' ? 'Fornecedor Original' : 'Mercado Local'}: <strong>{defaultMk}%</strong>
                                  </p>
                                  <p className="mt-0.5 text-amber-300">Este item requer aprovação.</p>
                                  <div className="absolute bottom-0 right-3 translate-y-1/2 rotate-45 h-2 w-2 bg-slate-900" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Sale price */}
                      <td className="px-3 py-3 text-right font-bold text-slate-900">
                        {(item.salePrice ?? 0) > 0
                          ? formatCurrency((item.salePrice ?? 0) * item.quantity)
                          : <span className="text-slate-400">R$ 0,00</span>
                        }
                      </td>
                      <td className="px-3 py-3">
                        <button type="button" onClick={() => removeACotarItem(item.id)} className="text-slate-400 hover:text-red-500 transition">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──── RODAPÉ: RESUMO + AÇÕES ──── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Totals */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Estoque</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(totals.totalEstoque ?? 0)}</p>
            </div>
            <div className="text-slate-300 text-lg font-light">+</div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total a Cotar</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(totals.totalACotar ?? 0)}</p>
            </div>
            <div className="text-slate-300 text-lg font-light">=</div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Preço de Venda Total</p>
              <p className="text-xl font-black text-[#F7C00C]">{formatCurrency(totals.total)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Export Report (disabled) */}
            <div className="group relative">
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-400 shadow-xs cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Exportar Relatório
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                <div className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] text-white shadow-lg whitespace-nowrap">
                  Em breve: gera lista de itens a cotar para fornecedores
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 h-2 w-2 bg-slate-900" />
                </div>
              </div>
            </div>

            {/* Send to Bling (disabled) */}
            <div className="group relative">
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-400 shadow-xs cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                Enviar para Bling
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                <div className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] text-white shadow-lg whitespace-nowrap">
                  Em breve: envia pedido de venda para o Bling ERP
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 h-2 w-2 bg-slate-900" />
                </div>
              </div>
            </div>

            {/* Draft */}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={!canFinalize}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              Salvar Rascunho
            </button>

            {/* Efetivar */}
            <button
              type="button"
              onClick={handleEfetivar}
              disabled={!canFinalize}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F7C00C] px-5 py-2.5 text-xs font-bold text-slate-900 shadow-sm transition-all hover:bg-[#E8B600] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Efetivar (Em Andamento)
            </button>
          </div>
        </div>

        {!canFinalize && allItems.length === 0 && (
          <p className="mt-3 text-[11px] text-slate-400">Adicione pelo menos 1 item para finalizar o protocolo.</p>
        )}
      </div>
    </section>
  );
}
