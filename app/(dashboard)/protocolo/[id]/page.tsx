'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createProtocol, calculateTotals } from '../../../lib/services/protocolService';
import { saveProtocolAction, getProtocolByIdAction } from '../../../lib/actions/protocols';
import { createClientAction } from '../../../lib/actions/clients';
import type { Protocol, ProtocolItem } from '../../../lib/types/database';
import { ItemFormState } from '../../../lib/config/protocolForm';
import { areItemsMatching } from '../../../lib/utils/protocolFormatters';
import toast from 'react-hot-toast';

import { useProtocolRealtime } from '../../../lib/hooks/useProtocolRealtime';
import { useProtocolState } from '../../../lib/hooks/useProtocolState';

import { HeaderProtocolo } from '../components/HeaderProtocolo';
import { FormularioAdicaoItem } from '../components/FormularioAdicaoItem';
import { TabelaEstoque } from '../components/TabelaEstoque';
import { TabelaCotacao } from '../components/TabelaCotacao';
import { ModalAvisoDuplo } from '../components/ModalAvisoDuplo';
import { ModalDivisaoEstoque } from '../components/ModalDivisaoEstoque';
import { ModalDeficitEstoque } from '../components/ModalDeficitEstoque';
import { FooterAcoes } from '../components/FooterAcoes';

const AUTOSAVE_DELAY = 1500;

export default function ProtocolDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isViewing, setIsViewing] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const isFinalizingRef = useRef(false);

  // ── Protocol header state ──
  const [clientName, setClientName] = useState('');
  const [clientCnpj, setClientCnpj] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [protocolTitle, setProtocolTitle] = useState('');
  const [protocolStatus, setProtocolStatus] = useState<Protocol['status']>('draft');
  const protocolIdRef = useRef<string | number>(params?.id || `proto-${Date.now()}`);

  // ── Realtime & Data ──
  const { stockProducts, stockLoading, registeredClients, registeredSealTypes } = useProtocolRealtime(
    !isNaN(Number(protocolIdRef.current)) ? Number(protocolIdRef.current) : undefined
  );

  // ── Protocol List State ──
  const {
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
  } = useProtocolState([], []);

  const allItems = [...estoqueItems, ...aCotarItems];

  // ── Load Protocol by ID ──
  useEffect(() => {
    if (params.id) {
      getProtocolByIdAction(params.id).then((res) => {
        if (res.success && res.data) {
          const p = res.data;
          setClientName(p.clientName);
          if (p.clientCnpj) setClientCnpj(p.clientCnpj);
          if (p.title) setProtocolTitle(p.title);
          setIsNewClient(p.isNewClient || false);
          if (p.id) protocolIdRef.current = p.id;
          if (p.status) setProtocolStatus(p.status);
          
          setEstoqueItems(p.items?.filter(i => i.type === 'estoque') || []);
          setACotarItems(p.items?.filter(i => i.type === 'a_cotar') || []);
          
          if (p.draftForm) {
            setItemForm(p.draftForm as ItemFormState);
          }
        }
      });
    }
  }, [params.id, setEstoqueItems, setACotarItems, setItemForm]);

  // ── Validation ──
  const cleanCnpjDigits = clientCnpj.replace(/\D/g, '');
  const isFormUnlocked = isNewClient
    ? clientName.trim().length > 0 && cleanCnpjDigits.length === 14
    : clientName.trim().length > 0;

  const isItemFormValid =
    itemForm.name.trim().length > 0 &&
    Number(itemForm.quantity) > 0 &&
    Object.values(itemForm.measurements).some((m) => m.trim().length > 0);

  const filteredSealTypes = useMemo(() => {
    if (!itemForm.name.trim()) return registeredSealTypes;
    return registeredSealTypes.filter((t) =>
      t.name.toLowerCase().includes(itemForm.name.trim().toLowerCase())
    );
  }, [registeredSealTypes, itemForm.name]);

  const isValidSealType = registeredSealTypes.some(
    (t) => t.name.toLowerCase() === itemForm.name.trim().toLowerCase()
  );

  // ── Auto-save ──
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isViewing || isFinalizing) return;
    if (isFinalizingRef.current) return;
    if (allItems.length === 0 && !clientName.trim()) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      
      const totalsObj = calculateTotals(allItems);
      const protocol = createProtocol({
        id: protocolIdRef.current,
        clientName: clientName.trim() || 'Rascunho Sem Cliente',
        clientCnpj: clientCnpj.trim() || undefined,
        isNewClient,
        title: protocolTitle.trim() || undefined,
        items: allItems,
        totals: { subtotal: totalsObj.subtotal, markup: totalsObj.markup, total: totalsObj.total },
        status: protocolStatus,
        draftForm: itemForm,
      });

      const res = await saveProtocolAction(protocol);
      if (res.success && res.data) {
        protocolIdRef.current = res.data.id;
      }
      setAutoSaveStatus('saved');
      setTimeout(() => { setAutoSaveStatus('idle'); }, 2000);
    }, AUTOSAVE_DELAY);

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [allItems, clientName, clientCnpj, isNewClient, protocolTitle, isViewing, protocolStatus, itemForm, isFinalizing]);


  // ── Verification / Reallocation Modal ──
  const [showReallocModal, setShowReallocModal] = useState(false);

  const reallocatableItems = useMemo(() => {
    return aCotarItems
      .map((item) => {
        const identifier = item.code || item.oem || item.name;
        const freeStock = getFreeStock(identifier, stockProducts);
        return { item, freeStock };
      })
      .filter((entry) => entry.freeStock > 0);
  }, [aCotarItems, stockProducts, getFreeStock]);

  // ── Split Stock Modal ──
  const [splitModalState, setSplitModalState] = useState<{
    isOpen: boolean;
    item: ProtocolItem | null;
    requestedQty: number;
    maxStock: number;
  }>({ isOpen: false, item: null, requestedQty: 0, maxStock: 0 });

  const handleExceedStock = useCallback((item: ProtocolItem, requestedQty: number, maxStock: number) => {
    setSplitModalState({ isOpen: true, item, requestedQty, maxStock });
  }, []);

  const handleConfirmSplit = useCallback(() => {
    if (!splitModalState.item) return;
    const { item, requestedQty, maxStock } = splitModalState;
    const excess = requestedQty - maxStock;
    
    splitEstoqueItem(item.id, maxStock, excess);
    setSplitModalState(prev => ({ ...prev, isOpen: false }));
  }, [splitModalState, splitEstoqueItem]);

  const canFinalize = allItems.length > 0 && clientName.trim().length > 0;

  const handleSaveDraft = useCallback(async (forcedEstoque?: ProtocolItem[], forcedACotar?: ProtocolItem[]) => {
    if (!canFinalize) return;
    setIsFinalizing(true);
    isFinalizingRef.current = true;
    
    try {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (isNewClient && clientCnpj.trim()) await createClientAction({ name: clientName.trim(), cnpj: clientCnpj.trim() }).catch(console.error);

      const finalEstoque = forcedEstoque || estoqueItems;
      const finalACotar = forcedACotar || aCotarItems;
      const totalsObj = calculateTotals([...finalEstoque, ...finalACotar]);

      const protocol = createProtocol({
        id: protocolIdRef.current,
        clientName: clientName.trim(),
        clientCnpj: clientCnpj.trim() || undefined,
        isNewClient,
        title: protocolTitle.trim() || undefined,
        items: [...finalEstoque, ...finalACotar],
        totals: { subtotal: totalsObj.subtotal, markup: totalsObj.markup, total: totalsObj.total },
        status: 'draft',
        draftForm: itemForm,
      });

      await saveProtocolAction(protocol);
      toast.success('Rascunho salvo com sucesso!');
      setIsViewing(true);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar rascunho.');
    } finally {
      setIsFinalizing(false);
      isFinalizingRef.current = false;
    }
  }, [canFinalize, clientName, clientCnpj, isNewClient, protocolTitle, estoqueItems, aCotarItems, itemForm]);

  const handleEfetivar = useCallback(async (forcedEstoque?: ProtocolItem[], forcedACotar?: ProtocolItem[]) => {
    if (!canFinalize) return;
    setIsFinalizing(true);
    isFinalizingRef.current = true;
    
    try {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (isNewClient && clientCnpj.trim()) await createClientAction({ name: clientName.trim(), cnpj: clientCnpj.trim() }).catch(console.error);

      const finalEstoque = forcedEstoque || estoqueItems;
      const finalACotar = forcedACotar || aCotarItems;
      const totalsObj = calculateTotals([...finalEstoque, ...finalACotar]);

      const protocol = createProtocol({
        id: protocolIdRef.current,
        clientName: clientName.trim(),
        clientCnpj: clientCnpj.trim() || undefined,
        isNewClient,
        title: protocolTitle.trim() || undefined,
        items: [...finalEstoque, ...finalACotar],
        totals: { subtotal: totalsObj.subtotal, markup: totalsObj.markup, total: totalsObj.total },
        status: 'in_progress',
        draftForm: itemForm,
      });

      await saveProtocolAction(protocol);
      toast.success('Cotação efetivada com sucesso!');
      setIsViewing(true);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao efetivar cotação.');
    } finally {
      setIsFinalizing(false);
      isFinalizingRef.current = false;
    }
  }, [canFinalize, clientName, clientCnpj, isNewClient, protocolTitle, estoqueItems, aCotarItems, itemForm]);

  const insufficientStockItems = useMemo(() => {
    return estoqueItems.map(item => {
      const identifier = item.code || item.oem || item.name;
      const product = stockProducts.find(p => (p.code || p.sku || p.name) === identifier);
      const maxAvailable = product ? product.stock : 0;
      return { item, maxAvailable, deficit: Number(item.quantity) - maxAvailable };
    }).filter(entry => entry.deficit > 0);
  }, [estoqueItems, stockProducts]);

  const [showDeficitModal, setShowDeficitModal] = useState(false);
  const [saveActionType, setSaveActionType] = useState<'draft' | 'efetivar'>('draft');

  const triggerSaveCheck = useCallback((actionType: 'draft' | 'efetivar') => {
    setSaveActionType(actionType);
    if (insufficientStockItems.length > 0) {
      setShowDeficitModal(true);
    } else if (reallocatableItems.length > 0) {
      setShowReallocModal(true);
    } else {
      if (actionType === 'draft') handleSaveDraft();
      else if (actionType === 'efetivar') handleEfetivar();
    }
  }, [insufficientStockItems.length, reallocatableItems.length, handleSaveDraft, handleEfetivar]);

  const handleConfirmDeficit = useCallback(() => {
    setShowDeficitModal(false);
    
    const splits = insufficientStockItems.map(entry => ({
      id: entry.item.id,
      maxStock: entry.maxAvailable,
      excessQty: entry.deficit
    }));
    
    splitMultipleEstoqueItems(splits);

    const updatedEstoque = estoqueItems.map(i => {
      const split = splits.find(s => s.id === i.id);
      return split ? { ...i, quantity: split.maxStock } : i;
    });
    
    let updatedACotar = [...aCotarItems];
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
      const existingIdx = updatedACotar.findIndex(i => areItemsMatching(i, quotedItem));
      if (existingIdx >= 0) {
        updatedACotar[existingIdx] = { 
          ...updatedACotar[existingIdx], 
          quantity: Number(updatedACotar[existingIdx].quantity) + split.excessQty 
        };
      } else {
        updatedACotar.push(quotedItem);
      }
    }

    if (reallocatableItems.length > 0) {
      setShowReallocModal(true);
    } else {
      if (saveActionType === 'draft') handleSaveDraft(updatedEstoque, updatedACotar);
      else if (saveActionType === 'efetivar') handleEfetivar(updatedEstoque, updatedACotar);
    }
  }, [insufficientStockItems, reallocatableItems, splitMultipleEstoqueItems, saveActionType, handleSaveDraft, handleEfetivar, estoqueItems, aCotarItems]);

  const handleConfirmRealloc = useCallback(async () => {
    const updatedEstoque = [...estoqueItems];
    let updatedACotar = [...aCotarItems];

    for (const { item, freeStock } of reallocatableItems) {
      const targetItem = updatedACotar.find(i => i.id === item.id);
      if (!targetItem) continue;

      const currentQty = Number(targetItem.quantity);
      const qtyToMove = Math.min(currentQty, freeStock);

      const newEstoqueItem: ProtocolItem = {
        ...targetItem,
        id: `item-${Date.now()}-${Math.random()}`,
        type: 'estoque',
        quantity: qtyToMove,
        supplierPrices: {},
        chosenSupplier: undefined,
        chosenSupplierType: undefined,
        markupPercent: 70,
        costPrice: 0,
        unitPrice: 0,
        salePrice: 0,
        needsApproval: false,
      };

      const existingIdx = updatedEstoque.findIndex(i => areItemsMatching(i, newEstoqueItem));
      if (existingIdx >= 0) {
        updatedEstoque[existingIdx] = { 
          ...updatedEstoque[existingIdx], 
          quantity: Number(updatedEstoque[existingIdx].quantity) + qtyToMove 
        };
      } else {
        updatedEstoque.push(newEstoqueItem);
      }

      if (qtyToMove === currentQty) {
        updatedACotar = updatedACotar.filter(i => i.id !== item.id);
      } else {
        updatedACotar = updatedACotar.map(i => (i.id === item.id ? { ...i, quantity: currentQty - qtyToMove } : i));
      }
    }

    setShowReallocModal(false);
    if (saveActionType === 'draft') await handleSaveDraft(updatedEstoque, updatedACotar);
    else if (saveActionType === 'efetivar') await handleEfetivar(updatedEstoque, updatedACotar);
  }, [reallocatableItems, estoqueItems, aCotarItems, saveActionType, handleSaveDraft, handleEfetivar]);

  const handleConfirmIgnore = useCallback(async () => {
    setShowReallocModal(false);
    if (saveActionType === 'draft') await handleSaveDraft();
    else if (saveActionType === 'efetivar') await handleEfetivar();
  }, [saveActionType, handleSaveDraft, handleEfetivar]);

  const totals = calculateTotals(allItems);

  return (
    <section className="space-y-5">
      <nav className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="hover:text-slate-900 transition">Dashboard</Link>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span className="font-semibold text-slate-800">
            {protocolTitle || `Protocolo #${protocolIdRef.current}`}
          </span>
        </div>
        
        {isViewing ? (
          <button
            onClick={() => setIsViewing(false)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7C00C] px-4 py-2 font-bold text-slate-900 shadow-sm transition-all hover:bg-[#E8B600]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Editar Protocolo
          </button>
        ) : (
          <button
            onClick={() => setIsViewing(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            Voltar ao Modo Visualização
          </button>
        )}
      </nav>

      <HeaderProtocolo
        clientName={clientName}
        setClientName={setClientName}
        clientCnpj={clientCnpj}
        setClientCnpj={setClientCnpj}
        isNewClient={isNewClient}
        setIsNewClient={setIsNewClient}
        registeredClients={registeredClients}
        protocolTitle={protocolTitle}
        setProtocolTitle={setProtocolTitle}
        protocolStatus={protocolStatus}
        autoSaveStatus={autoSaveStatus}
        isViewing={isViewing}
      />

      <FormularioAdicaoItem
        itemForm={itemForm}
        updateItemField={updateItemField}
        updateMeasurement={updateMeasurement}
        filteredSealTypes={filteredSealTypes}
        isValidSealType={isValidSealType}
        isItemFormValid={isItemFormValid}
        isFormUnlocked={isFormUnlocked}
        handleAddItem={handleAddItem}
        addFeedback={addFeedback}
        stockProducts={stockProducts}
        stockLoading={stockLoading}
        allItemsCount={allItems.length}
        getFreeStock={getFreeStock}
        isViewing={isViewing}
      />

      <TabelaEstoque
        items={estoqueItems}
        updateQuantity={updateEstoqueItemQuantity}
        removeItem={removeEstoqueItem}
        getFreeStock={(identifier) => getFreeStock(identifier, stockProducts)}
        onExceedStock={handleExceedStock}
        isViewing={isViewing}
      />

      <TabelaCotacao
        items={aCotarItems}
        estoqueItemsCount={estoqueItems.length}
        updateQuantity={updateACotarItemQuantity}
        removeItem={removeACotarItem}
        updateSupplierPrice={updateSupplierPrice}
        updateItemMarkup={updateItemMarkup}
        handleReallocate={handleReallocate}
        getFreeStock={(identifier) => getFreeStock(identifier, stockProducts)}
        isViewing={isViewing}
      />

      <FooterAcoes
        totals={totals}
        canFinalize={canFinalize}
        allItemsCount={allItems.length}
        triggerSaveCheck={triggerSaveCheck}
        isViewing={isViewing}
        protocolStatus={protocolStatus}
      />

      <ModalAvisoDuplo
        isOpen={showReallocModal}
        onClose={() => setShowReallocModal(false)}
        reallocatableItems={reallocatableItems}
        onConfirmRealloc={handleConfirmRealloc}
        onConfirmIgnore={handleConfirmIgnore}
        isLoading={isFinalizing}
      />

      <ModalDivisaoEstoque
        isOpen={splitModalState.isOpen}
        onClose={() => setSplitModalState(prev => ({ ...prev, isOpen: false }))}
        requestedQty={splitModalState.requestedQty}
        maxStock={splitModalState.maxStock}
        itemName={splitModalState.item?.name || ''}
        onConfirm={handleConfirmSplit}
      />

      <ModalDeficitEstoque
        isOpen={showDeficitModal}
        deficitItems={insufficientStockItems}
        onConfirm={handleConfirmDeficit}
        isLoading={isFinalizing}
      />
    </section>
  );
}
