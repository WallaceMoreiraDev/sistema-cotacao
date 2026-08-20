'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProtocol, calculateTotals } from '../services/protocolService';
import { areItemsMatching } from '../utils/protocolFormatters';
import {
  saveProtocolAction,
  reservarEstoqueAction,
  enviarParaBlingAction,
  cancelarCotacaoAction,
  estornarCotacaoAction,
  restaurarCotacaoAction,
} from '../actions/protocols';
import { useProtocolState } from './useProtocolState';
import type { Protocol, ProtocolItem, StockProduct } from '../types/database';
import toast from 'react-hot-toast';

const AUTOSAVE_DELAY = 1500;

interface UseProtocolPageOptions {
  protocolId?: string | number;
  initialStatus?: Protocol['status'];
  initialViewing?: boolean;
  registeredClients: Array<{ name: string }>;
  stockProducts: StockProduct[];
  suppliers: any[];
  navigateAfterSave?: boolean;
}

export function useProtocolPage({
  protocolId: initialProtocolId,
  initialStatus = 'nao_reservado',
  initialViewing = false,
  registeredClients,
  stockProducts,
  suppliers,
  navigateAfterSave = false,
}: UseProtocolPageOptions) {
  const router = useRouter();

  const [clientName, setClientName] = useState('');
  const [protocolTitle, setProtocolTitle] = useState('');
  const [protocolStatus, setProtocolStatus] = useState<Protocol['status']>(initialStatus);
  const [isViewing, setIsViewing] = useState(initialViewing);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const isFinalizingRef = useRef(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const protocolIdRef = useRef<string | number>(initialProtocolId ?? `proto-${Date.now()}`);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<any>>(Promise.resolve());
  const isDirtyRef = useRef(false);

  const {
    estoqueItems, setEstoqueItems, aCotarItems, setACotarItems,
    itemForm, setItemForm, addFeedback, getFreeStock,
    handleAddItem, handleAddStockItem, handleReallocate,
    removeEstoqueItem, updateEstoqueItemQuantity, splitEstoqueItem,
    splitMultipleEstoqueItems, removeACotarItem, updateACotarItemQuantity,
    updateSupplierCost, updateItemMarkup, updateItemField, updateMeasurement,
    clearItemForm, handleCreateNewItem,
  } = useProtocolState([], [], suppliers);

  const allItems = useMemo(() => [...estoqueItems, ...aCotarItems], [estoqueItems, aCotarItems]);

  const isFormUnlocked = useMemo(
    () => clientName.trim().length > 0 && registeredClients.some(
      c => c.name.toLowerCase() === clientName.trim().toLowerCase()
    ),
    [clientName, registeredClients]
  );

  const isItemFormValid = useMemo(
    () => itemForm.category?.trim().length > 0 && Number(itemForm.quantity) > 0 &&
      Object.values(itemForm.measurements).some(m => m?.trim().length > 0),
    [itemForm]
  );

  const canFinalize = allItems.length > 0 && isFormUnlocked;

  const canSendToBling = useMemo(() => {
    if (protocolStatus !== 'reservado') return false;
    return !allItems.some(item =>
      item.type === 'a_cotar' && (!item.unitPrice || item.unitPrice <= 0 ||
        (item.needsApproval && item.approvalStatus !== 'approved'))
    );
  }, [allItems, protocolStatus]);

  const queueSaveProtocol = useCallback((protocol: any, options?: { skipDiffLog?: boolean }) => {
    return new Promise<{ success: boolean; data?: any; error?: string }>((resolve, reject) => {
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        try {
          const res = await saveProtocolAction({ ...protocol, id: protocolIdRef.current }, options);
          resolve(res);
        } catch (e) { reject(e); }
      });
    });
  }, []);

  useEffect(() => {
    if (!isViewing) isDirtyRef.current = true;
  }, [allItems, clientName, protocolTitle, itemForm, isViewing]);

  useEffect(() => {
    if (isViewing || isFinalizing || isFinalizingRef.current) return;
    if (allItems.length === 0 && !clientName.trim()) return;
    if (!isDirtyRef.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      isDirtyRef.current = false;
      setAutoSaveStatus('saving');
      const totalsObj = calculateTotals(allItems);
      const protocol = createProtocol({
        id: protocolIdRef.current, clientName: clientName.trim() || 'Rascunho Sem Cliente',
        title: protocolTitle.trim() || undefined, items: allItems,
        totals: { subtotal: totalsObj.subtotal, markup: totalsObj.markup, total: totalsObj.total },
        status: protocolStatus, draftForm: itemForm,
      });
      const res = await queueSaveProtocol(protocol);
      if (res.success && res.data) protocolIdRef.current = res.data.id;
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }, AUTOSAVE_DELAY);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [allItems, clientName, protocolTitle, itemForm, isViewing, isFinalizing, protocolStatus, queueSaveProtocol]);

  const handleSaveDraft = useCallback(async (
    forcedEstoque?: ProtocolItem[], forcedACotar?: ProtocolItem[], options?: { skipDiffLog?: boolean }
  ) => {
    if (!canFinalize) return;
    setIsFinalizing(true); isFinalizingRef.current = true;
    try {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      const finalEstoque = forcedEstoque ?? estoqueItems;
      const finalACotar = forcedACotar ?? aCotarItems;
      const totalsObj = calculateTotals([...finalEstoque, ...finalACotar]);
      await queueSaveProtocol(createProtocol({
        id: protocolIdRef.current, clientName: clientName.trim(),
        title: protocolTitle.trim() || undefined, items: [...finalEstoque, ...finalACotar],
        totals: { subtotal: totalsObj.subtotal, markup: totalsObj.markup, total: totalsObj.total },
        status: protocolStatus, draftForm: itemForm,
      }), options);
      toast.success('Rascunho salvo com sucesso!');
      if (navigateAfterSave) router.push(`/protocolo/${protocolIdRef.current}`);
      else setIsViewing(true);
    } catch (e) { console.error(e); toast.error('Erro ao salvar rascunho.'); }
    finally { setIsFinalizing(false); isFinalizingRef.current = false; }
  }, [canFinalize, clientName, protocolTitle, estoqueItems, aCotarItems, itemForm, protocolStatus, navigateAfterSave, router, queueSaveProtocol]);

  const handleReservarEstoque = useCallback(async (
    forcedEstoque?: ProtocolItem[], forcedACotar?: ProtocolItem[], options?: { skipDiffLog?: boolean }
  ) => {
    if (!canFinalize) return;
    setIsFinalizing(true); isFinalizingRef.current = true;
    try {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      const finalEstoque = forcedEstoque ?? estoqueItems;
      const finalACotar = forcedACotar ?? aCotarItems;
      const totalsObj = calculateTotals([...finalEstoque, ...finalACotar]);
      await queueSaveProtocol(createProtocol({
        id: protocolIdRef.current, clientName: clientName.trim(),
        title: protocolTitle.trim() || undefined, items: [...finalEstoque, ...finalACotar],
        totals: { subtotal: totalsObj.subtotal, markup: totalsObj.markup, total: totalsObj.total },
        status: protocolStatus, draftForm: itemForm,
      }), options);
      const res = await reservarEstoqueAction(protocolIdRef.current);
      if (res.success) {
        toast.success('Estoque reservado com sucesso!'); setProtocolStatus('reservado');
        if (navigateAfterSave) router.push(`/protocolo/${protocolIdRef.current}`); else setIsViewing(true);
      } else {
        toast.error(res.error || 'Erro ao reservar estoque.');
        if (navigateAfterSave) router.push(`/protocolo/${protocolIdRef.current}`);
      }
    } catch (e) { console.error(e); toast.error('Erro ao reservar estoque.'); }
    finally { setIsFinalizing(false); isFinalizingRef.current = false; }
  }, [canFinalize, clientName, protocolTitle, estoqueItems, aCotarItems, itemForm, protocolStatus, navigateAfterSave, router, queueSaveProtocol]);

  const handleEnviarBling = useCallback(async (
    forcedEstoque?: ProtocolItem[], forcedACotar?: ProtocolItem[], options?: { skipDiffLog?: boolean }
  ) => {
    setIsFinalizing(true);
    try {
      await handleSaveDraft(forcedEstoque, forcedACotar, options);
      const res = await enviarParaBlingAction(protocolIdRef.current);
      if (res.success) { toast.success('Enviado para o Bling com sucesso!'); setProtocolStatus('finalizado'); setIsViewing(true); }
      else toast.error(res.error || 'Erro ao enviar para o Bling');
    } finally { setIsFinalizing(false); }
  }, [handleSaveDraft]);

  const handleCancelar = useCallback(() => setShowCancelModal(true), []);

  const confirmCancelar = useCallback(async () => {
    setShowCancelModal(false); setIsFinalizing(true);
    try {
      const currentId = protocolIdRef.current;
      if (typeof currentId === 'string' && currentId.startsWith('proto-')) { router.push('/dashboard'); return; }
      const res = await cancelarCotacaoAction(currentId);
      if (res.success) { toast.success('Cotação cancelada.'); setProtocolStatus('cancelado'); setIsViewing(true); }
      else toast.error(res.error || 'Erro ao cancelar cotação');
    } finally { setIsFinalizing(false); }
  }, [router]);

  const handleRestaurar = useCallback(async () => {
    setIsFinalizing(true);
    try {
      const res = await restaurarCotacaoAction(protocolIdRef.current);
      if (res.success) { toast.success('Protocolo restaurado com sucesso!'); setProtocolStatus('nao_reservado'); setIsViewing(false); }
      else toast.error(res.error || 'Erro ao restaurar cotação');
    } finally { setIsFinalizing(false); }
  }, []);

  const handleEstornar = useCallback(async () => {
    if (!window.confirm('Deseja estornar o protocolo para edição? Os itens já separados manterão a reserva.')) return;
    setIsFinalizing(true);
    try {
      const res = await estornarCotacaoAction(protocolIdRef.current);
      if (res.success) { toast.success('Protocolo estornado. Você pode editá-lo novamente.'); setProtocolStatus('reservado'); setIsViewing(false); }
      else toast.error(res.error || 'Erro ao estornar cotação');
    } finally { setIsFinalizing(false); }
  }, []);

  const [showReallocModal, setShowReallocModal] = useState(false);
  const [showDeficitModal, setShowDeficitModal] = useState(false);
  const [saveActionType, setSaveActionType] = useState<'draft' | 'reservar' | 'enviar'>('draft');
  const [splitModalState, setSplitModalState] = useState<{
    isOpen: boolean; item: ProtocolItem | null; requestedQty: number; maxStock: number;
  }>({ isOpen: false, item: null, requestedQty: 0, maxStock: 0 });

  const handleExceedStock = useCallback((item: ProtocolItem, requestedQty: number, maxStock: number) => {
    setSplitModalState({ isOpen: true, item, requestedQty, maxStock });
  }, []);

  const handleConfirmSplit = useCallback(() => {
    if (!splitModalState.item) return;
    splitEstoqueItem(splitModalState.item.id, splitModalState.maxStock, splitModalState.requestedQty - splitModalState.maxStock);
    setSplitModalState(prev => ({ ...prev, isOpen: false }));
  }, [splitModalState, splitEstoqueItem]);

  const reallocatableItems = useMemo(
    () => aCotarItems.map(item => ({
      item, freeStock: getFreeStock(item.code || item.oem || item.name, stockProducts)
    })).filter(e => e.freeStock > 0),
    [aCotarItems, stockProducts, getFreeStock]
  );

  const insufficientStockItems = useMemo(
    () => estoqueItems.map(item => {
      const identifier = item.code || item.oem || item.name;
      const product = stockProducts.find(p => (p.code || p.sku || p.name) === identifier);
      const maxAvailable = product ? product.stock : 0;
      return { item, maxAvailable, deficit: Number(item.quantity) - maxAvailable, heldBy: product?.heldBy || [] };
    }).filter(e => e.deficit > 0),
    [estoqueItems, stockProducts]
  );

  const triggerSaveCheck = useCallback((actionType: 'draft' | 'reservar' | 'enviar') => {
    setSaveActionType(actionType);
    if (insufficientStockItems.length > 0) setShowDeficitModal(true);
    else if (reallocatableItems.length > 0) setShowReallocModal(true);
    else {
      if (actionType === 'draft') handleSaveDraft();
      else if (actionType === 'reservar') handleReservarEstoque();
      else if (actionType === 'enviar') handleEnviarBling();
    }
  }, [insufficientStockItems.length, reallocatableItems.length, handleSaveDraft, handleReservarEstoque, handleEnviarBling]);

  const handleConfirmDeficit = useCallback(async () => {
    const splits = insufficientStockItems.map(e => ({ id: e.item.id, maxStock: e.maxAvailable, excessQty: e.deficit }));
    splitMultipleEstoqueItems(splits);
    const updatedEstoque = estoqueItems.map(i => { const s = splits.find(s => s.id === i.id); return s ? { ...i, quantity: s.maxStock } : i; }).filter(i => i.quantity > 0);
    let updatedACotar = [...aCotarItems];
    for (const split of splits) {
      const item = estoqueItems.find(i => i.id === split.id); if (!item) continue;
      const quotedItem: ProtocolItem = { ...item, id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-c`, quantity: split.excessQty, type: 'a_cotar', status: 'pendente', markupPercent: undefined, salePrice: 0, unitPrice: 0, costPrice: 0, needsApproval: false };
      const idx = updatedACotar.findIndex(i => areItemsMatching(i, quotedItem));
      if (idx >= 0) updatedACotar[idx] = { ...updatedACotar[idx], quantity: Number(updatedACotar[idx].quantity) + split.excessQty };
      else updatedACotar.push(quotedItem);
    }
    setEstoqueItems(updatedEstoque); setACotarItems(updatedACotar); setShowDeficitModal(false);
    if (reallocatableItems.length > 0) { setShowReallocModal(true); return; }
    if (saveActionType === 'draft') handleSaveDraft(updatedEstoque, updatedACotar);
    else if (saveActionType === 'reservar') handleReservarEstoque(updatedEstoque, updatedACotar);
    else if (saveActionType === 'enviar') handleEnviarBling(updatedEstoque, updatedACotar);
  }, [insufficientStockItems, estoqueItems, aCotarItems, splitMultipleEstoqueItems, setEstoqueItems, setACotarItems, reallocatableItems.length, saveActionType, handleSaveDraft, handleReservarEstoque, handleEnviarBling]);

  const handleConfirmRealloc = useCallback(async () => {
    let updatedEstoque = [...estoqueItems]; let updatedACotar = [...aCotarItems];
    for (const { item, freeStock } of reallocatableItems) {
      const targetItem = updatedACotar.find(i => i.id === item.id); if (!targetItem) continue;
      const currentQty = Number(targetItem.quantity); const qtyToMove = Math.min(currentQty, freeStock);
      const product = stockProducts.find(p => (p.code || p.sku || p.name) === (item.code || item.oem || item.name));
      const costPrice = product ? product.costPrice : 0;
      const newItem: ProtocolItem = { ...item, id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-e`, type: 'estoque', quantity: qtyToMove, markupPercent: 70, costPrice, unitPrice: costPrice, salePrice: costPrice * 1.7, needsApproval: false };
      const idx = updatedEstoque.findIndex(i => areItemsMatching(i, newItem));
      if (idx >= 0) updatedEstoque[idx] = { ...updatedEstoque[idx], quantity: Number(updatedEstoque[idx].quantity) + qtyToMove };
      else updatedEstoque.push(newItem);
      if (qtyToMove === currentQty) updatedACotar = updatedACotar.filter(i => i.id !== item.id);
      else updatedACotar = updatedACotar.map(i => i.id === item.id ? { ...i, quantity: currentQty - qtyToMove } : i);
    }
    setEstoqueItems(updatedEstoque); setACotarItems(updatedACotar); setShowReallocModal(false);
    if (saveActionType === 'draft') handleSaveDraft(updatedEstoque, updatedACotar);
    else if (saveActionType === 'reservar') handleReservarEstoque(updatedEstoque, updatedACotar);
    else if (saveActionType === 'enviar') handleEnviarBling(updatedEstoque, updatedACotar);
  }, [reallocatableItems, estoqueItems, aCotarItems, stockProducts, saveActionType, handleSaveDraft, handleReservarEstoque, handleEnviarBling, setEstoqueItems, setACotarItems]);

  const handleConfirmIgnore = useCallback(() => {
    setShowReallocModal(false);
    if (saveActionType === 'draft') handleSaveDraft();
    else if (saveActionType === 'reservar') handleReservarEstoque();
    else if (saveActionType === 'enviar') handleEnviarBling();
  }, [saveActionType, handleSaveDraft, handleReservarEstoque, handleEnviarBling]);

  return {
    clientName, setClientName, protocolTitle, setProtocolTitle,
    protocolStatus, setProtocolStatus, isViewing, setIsViewing,
    isFinalizing, autoSaveStatus, protocolIdRef,
    estoqueItems, setEstoqueItems, aCotarItems, setACotarItems,
    itemForm, setItemForm, addFeedback, getFreeStock,
    handleAddItem, handleAddStockItem, handleReallocate,
    removeEstoqueItem, updateEstoqueItemQuantity, splitEstoqueItem,
    removeACotarItem, updateACotarItemQuantity, updateSupplierCost,
    updateItemMarkup, updateItemField, updateMeasurement, clearItemForm,
    handleCreateNewItem, allItems,
    isFormUnlocked, isItemFormValid, canFinalize, canSendToBling,
    handleSaveDraft, handleReservarEstoque, handleEnviarBling,
    handleCancelar, confirmCancelar, handleRestaurar, handleEstornar,
    triggerSaveCheck,
    showCancelModal, setShowCancelModal,
    showReallocModal, setShowReallocModal,
    showDeficitModal, setShowDeficitModal,
    splitModalState, setSplitModalState,
    reallocatableItems, insufficientStockItems,
    handleExceedStock, handleConfirmSplit,
    handleConfirmDeficit, handleConfirmRealloc, handleConfirmIgnore,
  };
}
