'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createProtocol, calculateTotals } from '../../../lib/services/protocolService';
import { saveProtocolAction, getProtocolByIdAction, reservarEstoqueAction, enviarParaBlingAction, cancelarCotacaoAction, estornarCotacaoAction, restaurarCotacaoAction, insertLogAction } from '../../../lib/actions/protocols';
import { createClientAction } from '../../../lib/actions/clients';
import type { Protocol, ProtocolItem } from '../../../lib/types/database';
import { ItemFormState } from '../../../lib/config/protocolForm';
import { areItemsMatching, countUniqueProtocolItems } from '../../../lib/utils/protocolFormatters';
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
import { ModalCancelar } from '../components/ModalCancelar';
import { FooterAcoes } from '../components/FooterAcoes';

const AUTOSAVE_DELAY = 1500;

export default function ProtocolDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isViewing, setIsViewing] = useState(true);
  const [isProtocolLoading, setIsProtocolLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const isFinalizingRef = useRef(false);

  // ── Protocol header state ──
  const [clientName, setClientName] = useState('');
  const [protocolTitle, setProtocolTitle] = useState('');
  const [protocolStatus, setProtocolStatus] = useState<Protocol['status']>('nao_reservado');
  const protocolIdRef = useRef<string | number>(params?.id || `proto-${Date.now()}`);

  // ── Realtime & Data ──
  const { stockProducts, stockLoading, registeredClients, clientsLoading } = useProtocolRealtime(
    !isNaN(Number(protocolIdRef.current)) ? Number(protocolIdRef.current) : undefined
  );

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [sealFamilies, setSealFamilies] = useState<any[]>([]);

  useEffect(() => {
    import('../../../lib/actions/suppliers').then(m => {
      m.getSuppliersAction().then(res => {
        if (res.success && res.data) setSuppliers(res.data);
      });
    });
    import('../../../lib/actions/sealFamilies').then(m => {
      m.getSealFamiliesAction().then(res => {
        if (res.success && res.data) setSealFamilies(res.data);
      });
    });
  }, []);

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
    handleAddStockItem,
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
  } = useProtocolState([], [], suppliers);

  const allItems = useMemo(() => [...estoqueItems, ...aCotarItems], [estoqueItems, aCotarItems]);

  // ── Load Protocol by ID ──
  useEffect(() => {
    if (params.id) {
      getProtocolByIdAction(params.id).then((res) => {
        if (res.success && res.data) {
          const p = res.data;
          setClientName(p.clientName);
          if (p.title) setProtocolTitle(p.title);
          if (p.id) protocolIdRef.current = p.id;
          
          if (p.status) {
            const oldToNew: Record<string, string> = {
              'draft': 'nao_reservado',
              'in_progress': 'nao_reservado',
              'em_andamento': 'nao_reservado',
              'in_review': 'nao_reservado',
              'rejected': 'nao_reservado',
              'separating': 'reservado',
              'approved': 'finalizado',
            };
            const finalStatus = oldToNew[p.status] || p.status;
            setProtocolStatus(finalStatus as any);
            setIsViewing(finalStatus !== 'nao_reservado');
          }
          
          setEstoqueItems(p.items?.filter(i => i.type === 'estoque') || []);
          setACotarItems(p.items?.filter(i => i.type === 'a_cotar') || []);
          
          if (p.draftForm) {
            setItemForm(p.draftForm as ItemFormState);
          }
        }
        setIsProtocolLoading(false);
      });
    } else {
      setIsViewing(false);
      setIsProtocolLoading(false);
    }
  }, [params.id, setEstoqueItems, setACotarItems, setItemForm]);

  // ── Validation ──
  const isFormUnlocked = clientName.trim().length > 0 && registeredClients.some(c => c.name.toLowerCase() === clientName.trim().toLowerCase());

  const isItemFormValid =
    itemForm.category?.trim().length > 0 &&
    Number(itemForm.quantity) > 0 &&
    Object.values(itemForm.measurements).some((m) => m?.trim().length > 0);

  const [showCancelModal, setShowCancelModal] = useState(false);

  // ── Auto-save ──
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const saveQueueRef = useRef<Promise<any>>(Promise.resolve());

  const queueSaveProtocol = useCallback((protocol: any, options?: { skipDiffLog?: boolean }) => {
    return new Promise<{ success: boolean; data?: any; error?: string }>((resolve, reject) => {
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        try {
          const res = await saveProtocolAction(protocol, options);
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });
    });
  }, []);

  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (!isProtocolLoading && !isViewing) {
      isDirtyRef.current = true;
    }
  }, [allItems, clientName, isViewing, protocolTitle, itemForm]);

  useEffect(() => {
    if (isViewing || isFinalizing) return;
    if (isFinalizingRef.current) return;
    if (allItems.length === 0 && !clientName.trim()) return;
    if (!isDirtyRef.current) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(async () => {
      isDirtyRef.current = false;
      setAutoSaveStatus('saving');
      
      const totalsObj = calculateTotals(allItems);
      const protocol = createProtocol({
        id: protocolIdRef.current,
        clientName: clientName.trim() || 'Rascunho Sem Cliente',
        items: allItems,
        totals: { subtotal: totalsObj.subtotal, markup: totalsObj.markup, total: totalsObj.total },
        status: protocolStatus,
        draftForm: itemForm,
      });

      const res = await queueSaveProtocol(protocol);
      if (res.success && res.data) {
        protocolIdRef.current = res.data.id;
      }
      setAutoSaveStatus('saved');
      setTimeout(() => { setAutoSaveStatus('idle'); }, 2000);
    }, AUTOSAVE_DELAY);

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [allItems, clientName, isViewing, protocolStatus, itemForm, isFinalizing]);


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

  const handleSaveDraft = useCallback(async (forcedEstoque?: ProtocolItem[], forcedACotar?: ProtocolItem[], options?: { skipDiffLog?: boolean }) => {
    if (!canFinalize) return;
    setIsFinalizing(true);
    isFinalizingRef.current = true;
    
    try {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

      const finalEstoque = forcedEstoque || estoqueItems;
      const finalACotar = forcedACotar || aCotarItems;
      const totalsObj = calculateTotals([...finalEstoque, ...finalACotar]);
      
      const protocol = createProtocol({
        id: protocolIdRef.current,
        clientName: clientName.trim(),
        items: [...finalEstoque, ...finalACotar],
        totals: { subtotal: totalsObj.subtotal, markup: totalsObj.markup, total: totalsObj.total },
        status: protocolStatus,
        draftForm: itemForm,
      });

      await queueSaveProtocol(protocol, options);
      toast.success('Alterações salvas com sucesso!');
      setIsViewing(true);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar alterações.');
    } finally {
      setIsFinalizing(false);
      isFinalizingRef.current = false;
    }
  }, [canFinalize, clientName, estoqueItems, aCotarItems, itemForm, protocolStatus]);

  const handleReservarEstoque = useCallback(async (forcedEstoque?: ProtocolItem[], forcedACotar?: ProtocolItem[], options?: { skipDiffLog?: boolean }) => {
    if (!canFinalize) return;
    setIsFinalizing(true);
    
    try {
      await handleSaveDraft(forcedEstoque, forcedACotar, options); // force save before transitioning
      const res = await reservarEstoqueAction(protocolIdRef.current);
      if (res.success) {
        toast.success('Estoque reservado com sucesso!');
        setProtocolStatus('reservado');
        setIsViewing(true);
      } else {
        toast.error(res.error || 'Erro ao reservar estoque');
      }
    } catch (error) {
      toast.error('Erro na requisição');
    } finally {
      setIsFinalizing(false);
    }
  }, [canFinalize, handleSaveDraft]);

  const handleEnviarBling = useCallback(async (forcedEstoque?: ProtocolItem[], forcedACotar?: ProtocolItem[], options?: { skipDiffLog?: boolean }) => {
    setIsFinalizing(true);
    try {
      await handleSaveDraft(forcedEstoque, forcedACotar, options);
      const res = await enviarParaBlingAction(protocolIdRef.current);
      if (res.success) {
        toast.success('Enviado para o Bling com sucesso!');
        setProtocolStatus('finalizado');
        setIsViewing(true);
      } else {
        toast.error(res.error || 'Erro ao enviar para o Bling');
      }
    } finally {
      setIsFinalizing(false);
    }
  }, [handleSaveDraft]);

  const handleCancelar = useCallback(() => {
    setShowCancelModal(true);
  }, []);

  const confirmCancelar = useCallback(async () => {
    setShowCancelModal(false);
    setIsFinalizing(true);
    try {
      const res = await cancelarCotacaoAction(protocolIdRef.current);
      if (res.success) {
        toast.success('Cotação cancelada.');
        setProtocolStatus('cancelado');
        setIsViewing(true);
      } else {
        toast.error(res.error || 'Erro ao cancelar cotação');
      }
    } finally {
      setIsFinalizing(false);
    }
  }, []);

  const handleRestaurar = useCallback(async () => {
    setIsFinalizing(true);
    try {
      const res = await restaurarCotacaoAction(protocolIdRef.current);
      if (res.success) {
        toast.success('Protocolo restaurado com sucesso!');
        setProtocolStatus('nao_reservado');
        setIsViewing(false);
      } else {
        toast.error(res.error || 'Erro ao restaurar cotação');
      }
    } finally {
      setIsFinalizing(false);
    }
  }, []);

  const handleEstornar = useCallback(async () => {
    if (!window.confirm('Deseja estornar o protocolo para edição? Os itens já separados manterão a reserva.')) return;
    setIsFinalizing(true);
    try {
      const res = await estornarCotacaoAction(protocolIdRef.current);
      if (res.success) {
        toast.success('Protocolo estornado. Você pode editá-lo novamente.');
        setProtocolStatus('reservado');
        setIsViewing(false);
      } else {
        toast.error(res.error || 'Erro ao estornar cotação');
      }
    } finally {
      setIsFinalizing(false);
    }
  }, []);

  const canSendToBling = useMemo(() => {
    return !allItems.some(item => 
      (item.type === 'a_cotar' && (
        !item.unitPrice || 
        item.unitPrice <= 0 || 
        (item.needsApproval && item.approvalStatus !== 'approved')
      ))
    );
  }, [allItems]);

  const insufficientStockItems = useMemo(() => {
    return estoqueItems.map(item => {
      const identifier = item.code || item.oem || item.name;
      const product = stockProducts.find(p => (p.code || p.sku || p.name) === identifier);
      const maxAvailable = product ? product.stock : 0;
      return { item, maxAvailable, deficit: Number(item.quantity) - maxAvailable, heldBy: product?.heldBy || [] };
    }).filter(entry => entry.deficit > 0);
  }, [estoqueItems, stockProducts]);

  const [showDeficitModal, setShowDeficitModal] = useState(false);
  const [saveActionType, setSaveActionType] = useState<'draft' | 'reservar' | 'enviar' | null>(null);

  const triggerSaveCheck = useCallback((actionType: 'draft' | 'reservar' | 'enviar') => {
    setSaveActionType(actionType);
    if (insufficientStockItems.length > 0) {
      setShowDeficitModal(true);
    } else if (reallocatableItems.length > 0) {
      setShowReallocModal(true);
    } else {
      if (actionType === 'draft') handleSaveDraft();
      else if (actionType === 'reservar') handleReservarEstoque();
      else if (actionType === 'enviar') handleEnviarBling();
    }
  }, [insufficientStockItems.length, reallocatableItems.length, handleSaveDraft, handleReservarEstoque, handleEnviarBling]);

  const handleConfirmDeficit = useCallback(async () => {
    const splits = insufficientStockItems.map(entry => ({
      id: entry.item.id,
      maxStock: entry.maxAvailable,
      excessQty: entry.deficit
    }));
    
    splitMultipleEstoqueItems(splits);

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
    
    setEstoqueItems(updatedEstoque);
    setACotarItems(updatedACotar);
    setShowDeficitModal(false);

    if (reallocatableItems.length > 0) {
      setShowReallocModal(true);
    } else {
      if (saveActionType === 'draft') handleSaveDraft(updatedEstoque, updatedACotar);
      else if (saveActionType === 'reservar') handleReservarEstoque(updatedEstoque, updatedACotar);
      else if (saveActionType === 'enviar') handleEnviarBling(updatedEstoque, updatedACotar);
    }
  }, [insufficientStockItems, estoqueItems, aCotarItems, splitMultipleEstoqueItems, setEstoqueItems, setACotarItems, reallocatableItems.length, saveActionType, handleSaveDraft, handleReservarEstoque, handleEnviarBling]);

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
        ...item,
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
    setShowReallocModal(false);
    
    if (saveActionType === 'draft') handleSaveDraft(updatedEstoque, updatedACotar);
    else if (saveActionType === 'reservar') handleReservarEstoque(updatedEstoque, updatedACotar);
    else if (saveActionType === 'enviar') handleEnviarBling(updatedEstoque, updatedACotar);
  }, [reallocatableItems, estoqueItems, aCotarItems, saveActionType, handleSaveDraft, handleReservarEstoque, handleEnviarBling, areItemsMatching, setEstoqueItems, setACotarItems]);

  const handleConfirmIgnore = useCallback(() => {
    setShowReallocModal(false);
    if (saveActionType === 'draft') handleSaveDraft();
    else if (saveActionType === 'reservar') handleReservarEstoque();
    else if (saveActionType === 'enviar') handleEnviarBling();
  }, [saveActionType, handleSaveDraft, handleReservarEstoque, handleEnviarBling]);

  const totals = calculateTotals(allItems);

  if (isProtocolLoading) {
    return (
      <section className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="h-8 w-8 animate-spin text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium text-slate-500 animate-pulse">Carregando protocolo...</span>
        </div>
      </section>
    );
  }

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
        registeredClients={registeredClients}
        protocolTitle={protocolTitle}
        setProtocolTitle={setProtocolTitle}
        protocolStatus={protocolStatus}
        autoSaveStatus={autoSaveStatus}
        isViewing={isViewing}
        clientsLoading={clientsLoading}
      />

      <FormularioAdicaoItem
        itemForm={itemForm}
        sealFamilies={sealFamilies}
        updateItemField={updateItemField}
        updateMeasurement={updateMeasurement}
        isItemFormValid={isItemFormValid}
        isFormUnlocked={isFormUnlocked}
        handleAddItem={handleAddItem}
        handleAddStockItem={handleAddStockItem}
        addFeedback={addFeedback}
        stockProducts={stockProducts}
        stockLoading={stockLoading}
        allItemsCount={allItems.length}
        getFreeStock={getFreeStock}
        isViewing={isViewing}
        onClearForm={clearItemForm}
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
        suppliers={suppliers}
        estoqueItemsCount={estoqueItems.length}
        updateQuantity={updateACotarItemQuantity}
        updateSupplierCost={updateSupplierCost}
        removeItem={removeACotarItem}
        updateItemMarkup={updateItemMarkup}
        handleReallocate={(id, qty) => handleReallocate(id, qty, stockProducts)}
        getFreeStock={(identifier) => getFreeStock(identifier, stockProducts)}
        isViewing={isViewing}
      />

      <FooterAcoes
        totals={totals}
        canFinalize={canFinalize}
        allItemsCount={countUniqueProtocolItems(allItems)}
        isViewing={isViewing}
        protocolStatus={protocolStatus}
        isLoading={isFinalizing}
        canSendToBling={canSendToBling}
        onSaveDraft={() => triggerSaveCheck('draft')}
        onReservar={() => triggerSaveCheck('reservar')}
        onEnviarBling={() => triggerSaveCheck('enviar')}
        onCancelar={handleCancelar}
        onEstornar={handleEstornar}
        onRestaurar={handleRestaurar}
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
