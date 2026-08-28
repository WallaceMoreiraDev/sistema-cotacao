'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getProtocolByIdAction } from '../../../lib/actions/protocols';
import { calculateTotals } from '../../../lib/services/protocolService';
import { countUniqueProtocolItems } from '../../../lib/utils/protocolFormatters';
import type { Protocol } from '../../../lib/types/database';
import { ItemFormState } from '../../../lib/config/protocolForm';
import { useProtocolRealtime } from '../../../lib/hooks/useProtocolRealtime';
import { useProtocolPage } from '../../../lib/hooks/useProtocolPage';
import { useAuth } from '../../../context/AuthContext';
import { HeaderProtocolo } from '../components/HeaderProtocolo';
import { FormularioAdicaoItem } from '../components/FormularioAdicaoItem';
import { TabelaEstoque } from '../components/TabelaEstoque';
import { TabelaCotacao } from '../components/TabelaCotacao';
import { ModalAvisoDuplo } from '../components/ModalAvisoDuplo';
import { ModalDivisaoEstoque } from '../components/ModalDivisaoEstoque';
import { ModalDeficitEstoque } from '../components/ModalDeficitEstoque';
import { ModalCancelar } from '../components/ModalCancelar';
import { FooterAcoes } from '../components/FooterAcoes';
import GestaoFretes from '../components/GestaoFretes';

export default function ProtocolDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [isProtocolLoading, setIsProtocolLoading] = useState(true);
  const { stockProducts, stockLoading, registeredClients, clientsLoading } = useProtocolRealtime(
    !isNaN(Number(params?.id)) ? Number(params.id) : undefined
  );
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [sealFamilies, setSealFamilies] = useState<any[]>([]);
  useEffect(() => {
    import('../../../lib/actions/suppliers').then(m => {
      m.getSuppliersAction().then(res => { if (res.success && res.data) setSuppliers(res.data); });
    });
    import('../../../lib/actions/sealFamilies').then(m => {
      m.getSealFamiliesAction().then(res => { if (res.success && res.data) setSealFamilies(res.data); });
    });
  }, []);
  const {
    clientName, setClientName, protocolTitle, setProtocolTitle,
    protocolStatus, setProtocolStatus, isViewing, setIsViewing,
    isFinalizing, autoSaveStatus, protocolIdRef,
    estoqueItems, setEstoqueItems, aCotarItems, setACotarItems,
    itemForm, setItemForm, addFeedback, getFreeStock,
    handleAddItem, handleAddStockItem, handleReallocate,
    removeEstoqueItem, updateEstoqueItemQuantity,
    removeACotarItem, updateACotarItemQuantity, updateSupplierCost,
    forceItemSupplier, toggleExcludeFromPurchasing, updateItemMarkup, updateItemField, updateMeasurement, clearItemForm,
    handleCreateNewItem, allItems,
    isFormUnlocked, isItemFormValid, canFinalize, canSendToBling,
    handleCancelar, confirmCancelar, handleRestaurar, handleEstornar,
    triggerSaveCheck,
    showCancelModal, setShowCancelModal,
    showReallocModal, setShowReallocModal,
    showDeficitModal, setShowDeficitModal,
    splitModalState, setSplitModalState,
    reallocatableItems, insufficientStockItems,
    handleExceedStock, handleConfirmSplit,
    handleConfirmDeficit, handleConfirmRealloc, handleConfirmIgnore,
    supplierFreights, setSupplierFreights, updateSupplierFreight,
  } = useProtocolPage({
    protocolId: params?.id,
    initialViewing: true,
    navigateAfterSave: false,
    registeredClients,
    stockProducts,
    suppliers,
    userRole: user?.role,
  });
  useEffect(() => {
    if (params.id) {
      getProtocolByIdAction(params.id).then(res => {
        if (res.success && res.data) {
          const p = res.data;
          setClientName(p.clientName);
          if (p.title) setProtocolTitle(p.title);
          if (p.id) protocolIdRef.current = p.id;
          if (p.status) {
            const oldToNew: Record<string, string> = {
              'draft': 'nao_reservado', 'in_progress': 'nao_reservado',
              'em_andamento': 'nao_reservado', 'in_review': 'nao_reservado',
              'rejected': 'nao_reservado', 'separating': 'reservado', 'approved': 'finalizado',
            };
            const finalStatus = (oldToNew[p.status] || p.status) as Protocol['status'];
            setProtocolStatus(finalStatus);
            setIsViewing(finalStatus !== 'nao_reservado');
          }
          setEstoqueItems(p.items?.filter(i => i.type === 'estoque') || []);
          setACotarItems(p.items?.filter(i => i.type === 'a_cotar') || []);
          if (p.draftForm) setItemForm(p.draftForm as ItemFormState);
          setSupplierFreights(p.supplierFreights || {});
        }
        setIsProtocolLoading(false);
      });
    } else {
      setIsViewing(false);
      setIsProtocolLoading(false);
    }
  }, [params.id, setEstoqueItems, setACotarItems, setItemForm, setClientName, setProtocolTitle, setProtocolStatus, setIsViewing, protocolIdRef, setSupplierFreights]);
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
          <span className="font-semibold text-slate-800">{protocolTitle || `Protocolo #${protocolIdRef.current}`}</span>
        </div>
        {isViewing ? (
          <button onClick={() => setIsViewing(false)} className="inline-flex items-center gap-2 rounded-xl bg-[#F7C00C] px-4 py-2 font-bold text-slate-900 shadow-sm transition-all hover:bg-[#E8B600]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Editar Protocolo
          </button>
        ) : (
          <button onClick={() => setIsViewing(true)} className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            Voltar ao Modo Visualizacao
          </button>
        )}
      </nav>
      <HeaderProtocolo clientName={clientName} setClientName={setClientName}
        registeredClients={registeredClients} protocolTitle={protocolTitle}
        setProtocolTitle={setProtocolTitle} protocolStatus={protocolStatus}
        autoSaveStatus={autoSaveStatus} isViewing={isViewing} clientsLoading={clientsLoading} />
      <FormularioAdicaoItem itemForm={itemForm} sealFamilies={sealFamilies}
        updateItemField={updateItemField} updateMeasurement={updateMeasurement}
        isItemFormValid={isItemFormValid} isFormUnlocked={isFormUnlocked}
        handleAddItem={handleAddItem} handleAddStockItem={handleAddStockItem}
        addFeedback={addFeedback} stockProducts={stockProducts} stockLoading={stockLoading}
        allItemsCount={allItems.length} getFreeStock={getFreeStock}
        isViewing={isViewing} onClearForm={clearItemForm} handleCreateNewItem={handleCreateNewItem} />
      <TabelaEstoque items={estoqueItems} updateQuantity={updateEstoqueItemQuantity}
        removeItem={removeEstoqueItem} getFreeStock={identifier => getFreeStock(identifier, stockProducts)}
        onExceedStock={handleExceedStock} isViewing={isViewing} stockProducts={stockProducts} suppliers={suppliers} userRole={user?.role} />
      <TabelaCotacao items={aCotarItems} suppliers={suppliers} estoqueItemsCount={estoqueItems.length}
        updateQuantity={updateACotarItemQuantity} updateSupplierCost={updateSupplierCost}
        removeItem={removeACotarItem} updateItemMarkup={updateItemMarkup}
        forceItemSupplier={forceItemSupplier}
        toggleExcludeFromPurchasing={toggleExcludeFromPurchasing}
        userRole={user?.role}
        stockProducts={stockProducts}
        handleReallocate={(id, qty) => handleReallocate(id, qty, stockProducts)}
        getFreeStock={identifier => getFreeStock(identifier, stockProducts)} isViewing={isViewing}
        protocolId={protocolIdRef.current} />
        
      <GestaoFretes
        aCotarItems={aCotarItems}
        suppliers={suppliers}
        supplierFreights={supplierFreights}
        updateSupplierFreight={updateSupplierFreight}
        isViewing={isViewing}
      />

      <FooterAcoes totals={totals} canFinalize={canFinalize} allItemsCount={countUniqueProtocolItems(allItems)}
        isViewing={isViewing} protocolStatus={protocolStatus} isLoading={isFinalizing}
        canSendToBling={canSendToBling} userRole={user?.role}
        onSaveDraft={() => triggerSaveCheck('draft')}
        onReservar={() => triggerSaveCheck('reservar')}
        onEnviarBling={() => triggerSaveCheck('enviar')}
        onCancelar={handleCancelar} onEstornar={handleEstornar} onRestaurar={handleRestaurar} />
      <ModalAvisoDuplo isOpen={showReallocModal} onClose={() => setShowReallocModal(false)}
        reallocatableItems={reallocatableItems} onConfirmRealloc={handleConfirmRealloc}
        onConfirmIgnore={handleConfirmIgnore} isLoading={isFinalizing} />
      <ModalDivisaoEstoque isOpen={splitModalState.isOpen}
        onClose={() => setSplitModalState(prev => ({ ...prev, isOpen: false }))}
        requestedQty={splitModalState.requestedQty} maxStock={splitModalState.maxStock}
        itemName={splitModalState.item?.name || ''} onConfirm={handleConfirmSplit} />
      <ModalDeficitEstoque isOpen={showDeficitModal} deficitItems={insufficientStockItems}
        onConfirm={handleConfirmDeficit} onClose={() => setShowDeficitModal(false)} isLoading={isFinalizing} />
      <ModalCancelar isOpen={showCancelModal} onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelar} isLoading={isFinalizing} />
    </section>
  );
}