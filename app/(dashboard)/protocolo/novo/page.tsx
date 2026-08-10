'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createProtocol, calculateTotals } from '../../../lib/services/protocolService';
import { areItemsMatching, countUniqueProtocolItems } from '../../../lib/utils/protocolFormatters';
import { saveProtocolAction, cancelarCotacaoAction, reservarEstoqueAction } from '../../../lib/actions/protocols';
import { createClientAction } from '../../../lib/actions/clients';
import type { ProtocolItem } from '../../../lib/types/database';

import { useProtocolRealtime } from '../../../lib/hooks/useProtocolRealtime';
import { useProtocolState } from '../../../lib/hooks/useProtocolState';
import toast from 'react-hot-toast';

import { HeaderProtocolo } from '../components/HeaderProtocolo';
import { FormularioAdicaoItem } from '../components/FormularioAdicaoItem';
import { TabelaEstoque } from '../components/TabelaEstoque';
import { TabelaCotacao } from '../components/TabelaCotacao';
import { ModalAvisoDuplo } from '../components/ModalAvisoDuplo';
import { ModalDivisaoEstoque } from '../components/ModalDivisaoEstoque';
import { ModalDeficitEstoque } from '../components/ModalDeficitEstoque';
import { ModalCancelar } from '../components/ModalCancelar';
import { FooterAcoes } from '../components/FooterAcoes';

const AUTOSAVE_DELAY = 1500;

export default function NewProtocolPage() {
  const router = useRouter();

  // ── Protocol header state ──
  const [clientName, setClientName] = useState('');
  const [clientCnpj, setClientCnpj] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [protocolTitle, setProtocolTitle] = useState('');
  const protocolIdRef = useRef<string | number>(`proto-${Date.now()}`);

  const [isFinalizing, setIsFinalizing] = useState(false);
  const isFinalizingRef = useRef(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // ── Realtime & Data ──
  const { stockProducts, stockLoading, registeredClients, clientsLoading } = useProtocolRealtime();

  // ── Protocol List State ──
  const [suppliers, setSuppliers] = useState<any[]>([]);
  useEffect(() => {
    import('../../../lib/actions/suppliers').then(m => {
      m.getSuppliersAction().then(res => {
        if (res.success && res.data) setSuppliers(res.data);
      });
    });
  }, []);

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
    updateItemMarkup,
    updateItemField,
    updateMeasurement,
    clearItemForm,
  } = useProtocolState([], [], suppliers);

  const allItems = [...estoqueItems, ...aCotarItems];

  // ── Validation ──
  const cleanCnpjDigits = clientCnpj.replace(/\D/g, '');
  const isFormUnlocked = isNewClient
    ? clientName.trim().length > 0 && (cleanCnpjDigits.length === 14 || cleanCnpjDigits.length === 11)
    : clientName.trim().length > 0;

  const isItemFormValid =
    itemForm.name.trim().length > 0 &&
    Number(itemForm.quantity) > 0 &&
    Object.values(itemForm.measurements).some((m) => m.trim().length > 0);



  // ── Auto-save ──
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveQueueRef = useRef<Promise<any>>(Promise.resolve());

  const queueSaveProtocol = useCallback((protocol: any, options?: { skipDiffLog?: boolean }) => {
    return new Promise<{ success: boolean; data?: any; error?: string }>((resolve, reject) => {
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        try {
          // Garante que se um save anterior na fila já criou o ID real, os próximos usem ele.
          const protocolToSave = { ...protocol, id: protocolIdRef.current };
          const res = await saveProtocolAction(protocolToSave, options);
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });
    });
  }, []);

  useEffect(() => {
    if (isFinalizing || isFinalizingRef.current) return;
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
        status: 'nao_reservado',
      });

      const res = await queueSaveProtocol(protocol);
      if (res.success && res.data) {
        protocolIdRef.current = res.data.id;
      }
      setAutoSaveStatus('saved');
      setTimeout(() => { setAutoSaveStatus('idle'); }, 2000);
    }, AUTOSAVE_DELAY);

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [allItems, clientName, clientCnpj, isNewClient, protocolTitle, itemForm, isFinalizing]);


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
        status: 'nao_reservado',
        draftForm: itemForm,
      });

      await queueSaveProtocol(protocol);
      toast.success('Rascunho salvo com sucesso!');
      router.push(`/protocolo/${protocolIdRef.current}`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar rascunho.');
    } finally {
      setIsFinalizing(false);
      isFinalizingRef.current = false;
    }
  }, [canFinalize, clientName, clientCnpj, isNewClient, protocolTitle, estoqueItems, aCotarItems, itemForm, router]);

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
        status: 'nao_reservado',
      });

      await queueSaveProtocol(protocol);
      
      const res = await reservarEstoqueAction(protocolIdRef.current);
      if (res.success) {
        toast.success('Estoque reservado com sucesso!');
        router.push(`/protocolo/${protocolIdRef.current}`);
      } else {
        toast.error(res.error || 'Erro ao reservar estoque. O rascunho foi salvo.');
        router.push(`/protocolo/${protocolIdRef.current}`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao efetivar cotação.');
    } finally {
      setIsFinalizing(false);
      isFinalizingRef.current = false;
    }
  }, [canFinalize, clientName, clientCnpj, isNewClient, protocolTitle, estoqueItems, aCotarItems, router]);

  const handleCancelar = useCallback(() => {
    setShowCancelModal(true);
  }, []);

  const confirmCancelar = useCallback(async () => {
    setShowCancelModal(false);
    setIsFinalizing(true);
    try {
      const currentId = protocolIdRef.current;
      if (typeof currentId === 'string' && currentId.startsWith('proto-')) {
        // Not saved yet, just go back
        router.push('/dashboard');
        return;
      }
      
      const res = await cancelarCotacaoAction(currentId);
      if (res.success) {
        toast.success('Cotação cancelada.');
        router.push(`/protocolo/${currentId}`);
      } else {
        toast.error(res.error || 'Erro ao cancelar cotação');
      }
    } finally {
      setIsFinalizing(false);
    }
  }, [router]);

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

  const handleConfirmDeficit = useCallback(async () => {
    const splits = insufficientStockItems.map(entry => ({
      id: entry.item.id,
      maxStock: entry.maxAvailable,
      excessQty: entry.deficit
    }));
    
    splitMultipleEstoqueItems(splits);
    
    if (reallocatableItems.length > 0) {
      setShowReallocModal(true);
    } else {
      const updatedEstoque = estoqueItems.map(i => {
        const split = splits.find(s => s.id === i.id);
        return split ? { ...i, quantity: split.maxStock } : i;
      }).filter(i => i.quantity > 0);
      
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

      if (saveActionType === 'draft') await handleSaveDraft(updatedEstoque, updatedACotar);
      else if (saveActionType === 'efetivar') await handleEfetivar(updatedEstoque, updatedACotar);
      setShowDeficitModal(false);
    }
  }, [insufficientStockItems, reallocatableItems, splitMultipleEstoqueItems, saveActionType, handleSaveDraft, handleEfetivar, estoqueItems, aCotarItems, areItemsMatching]);

  const handleConfirmRealloc = useCallback(async () => {
    const updatedEstoque = [...estoqueItems];
    let updatedACotar = [...aCotarItems];

    for (const { item, freeStock } of reallocatableItems) {
      const targetItem = updatedACotar.find(i => i.id === item.id);
      if (!targetItem) continue;

      const currentQty = Number(targetItem.quantity);
      const qtyToMove = Math.min(currentQty, freeStock);

      const identifier = item.code || item.oem || item.name;
      const product = stockProducts.find(p => (p.code || p.sku || p.name) === identifier);
      const costPrice = product ? product.costPrice : 0;

      const newEstoqueItem: ProtocolItem = {
        ...targetItem,
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-e`,
        type: 'estoque',
        quantity: qtyToMove,
        markupPercent: 70,
        costPrice: costPrice,
        unitPrice: costPrice,
        salePrice: costPrice * 1.7,
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

    setEstoqueItems(updatedEstoque);
    setACotarItems(updatedACotar);

    if (saveActionType === 'draft') await handleSaveDraft(updatedEstoque, updatedACotar);
    else if (saveActionType === 'efetivar') await handleEfetivar(updatedEstoque, updatedACotar);
    
    setShowReallocModal(false);
  }, [reallocatableItems, estoqueItems, aCotarItems, saveActionType, handleSaveDraft, handleEfetivar, areItemsMatching, setEstoqueItems, setACotarItems]);

  const handleConfirmIgnore = useCallback(async () => {
    if (saveActionType === 'draft') await handleSaveDraft();
    else if (saveActionType === 'efetivar') await handleEfetivar();
    
    setShowReallocModal(false);
  }, [saveActionType, handleSaveDraft, handleEfetivar]);

  const totals = calculateTotals(allItems);

  return (
    <section className="space-y-5">
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard" className="hover:text-slate-900 transition">Dashboard</Link>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="font-semibold text-slate-800">Novo Protocolo</span>
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
        autoSaveStatus={autoSaveStatus}
        clientsLoading={clientsLoading}
      />

      <FormularioAdicaoItem
        itemForm={itemForm}
        updateItemField={updateItemField}
        updateMeasurement={updateMeasurement}
        isItemFormValid={isItemFormValid}
        isFormUnlocked={isFormUnlocked}
        handleAddItem={handleAddItem}
        addFeedback={addFeedback}
        stockProducts={stockProducts}
        stockLoading={stockLoading}
        allItemsCount={allItems.length}
        getFreeStock={getFreeStock}
        onClearForm={clearItemForm}
      />

      <TabelaEstoque
        items={estoqueItems}
        updateQuantity={updateEstoqueItemQuantity}
        removeItem={removeEstoqueItem}
        getFreeStock={(identifier) => getFreeStock(identifier, stockProducts)}
        onExceedStock={handleExceedStock}
      />

      <TabelaCotacao
        items={aCotarItems}
        suppliers={suppliers}
        estoqueItemsCount={estoqueItems.length}
        updateQuantity={updateACotarItemQuantity}
        removeItem={removeACotarItem}
        updateItemMarkup={updateItemMarkup}
        handleReallocate={(id, qty) => handleReallocate(id, qty, stockProducts)}
        getFreeStock={(identifier) => getFreeStock(identifier, stockProducts)}
      />

      <FooterAcoes
        totals={totals}
        canFinalize={canFinalize}
        allItemsCount={countUniqueProtocolItems(allItems)}
        isViewing={false}
        protocolStatus={'nao_reservado'}
        isLoading={isFinalizing}
        canSendToBling={false}
        onSaveDraft={() => triggerSaveCheck('draft')}
        onReservar={() => triggerSaveCheck('efetivar')}
        onEnviarBling={() => {}}
        onCancelar={handleCancelar}
        onEstornar={() => {}}
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
        onClose={() => setShowDeficitModal(false)}
        isLoading={isFinalizing}
      />

      <ModalCancelar
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelar}
        isLoading={isFinalizing}
      />
    </section>
  );
}
