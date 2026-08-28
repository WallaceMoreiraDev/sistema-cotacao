'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { calculateTotals } from '../../../lib/services/protocolService';
import { countUniqueProtocolItems } from '../../../lib/utils/protocolFormatters';

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

export default function NewProtocolPage() {
  const { user } = useAuth();
  const { stockProducts, stockLoading, registeredClients, clientsLoading } = useProtocolRealtime();

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
    autoSaveStatus, isFinalizing,
    estoqueItems, aCotarItems, itemForm, addFeedback, getFreeStock,
    handleAddItem, handleAddStockItem, handleReallocate,
    removeEstoqueItem, updateEstoqueItemQuantity, splitEstoqueItem,
    removeACotarItem, updateACotarItemQuantity, updateSupplierCost,
    forceItemSupplier, toggleExcludeFromPurchasing, updateItemMarkup, updateItemField, updateMeasurement, clearItemForm,
    handleCreateNewItem, allItems,
    isFormUnlocked, isItemFormValid, canFinalize,
    triggerSaveCheck, handleCancelar, confirmCancelar,
    showCancelModal, setShowCancelModal,
    showReallocModal, setShowReallocModal,
    showDeficitModal, setShowDeficitModal,
    splitModalState, setSplitModalState,
    reallocatableItems, insufficientStockItems,
    handleExceedStock, handleConfirmSplit,
    handleConfirmDeficit, handleConfirmRealloc, handleConfirmIgnore,
    protocolIdRef,
  } = useProtocolPage({
    initialViewing: false,
    navigateAfterSave: true,
    registeredClients,
    stockProducts,
    suppliers,
    userRole: user?.role,
  });

  const totals = calculateTotals(allItems);

  return (
    <section className="space-y-5">
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard" className="hover:text-slate-900 transition">Dashboard</Link>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="font-semibold text-slate-800">Novo Protocolo</span>
      </nav>

      <HeaderProtocolo
        clientName={clientName} setClientName={setClientName}
        registeredClients={registeredClients} protocolTitle={protocolTitle}
        setProtocolTitle={setProtocolTitle} autoSaveStatus={autoSaveStatus}
        clientsLoading={clientsLoading}
      />

      <FormularioAdicaoItem
        itemForm={itemForm} sealFamilies={sealFamilies}
        updateItemField={updateItemField} updateMeasurement={updateMeasurement}
        isItemFormValid={isItemFormValid} isFormUnlocked={isFormUnlocked}
        handleAddItem={handleAddItem} handleAddStockItem={handleAddStockItem}
        addFeedback={addFeedback} stockProducts={stockProducts} stockLoading={stockLoading}
        allItemsCount={allItems.length} getFreeStock={getFreeStock}
        onClearForm={clearItemForm} handleCreateNewItem={handleCreateNewItem}
      />

      <TabelaEstoque
        items={estoqueItems} updateQuantity={updateEstoqueItemQuantity}
        removeItem={removeEstoqueItem} getFreeStock={identifier => getFreeStock(identifier, stockProducts)}
        onExceedStock={handleExceedStock} stockProducts={stockProducts} suppliers={suppliers} />

      <TabelaCotacao
        items={aCotarItems} suppliers={suppliers}
        estoqueItemsCount={estoqueItems.length}
        updateQuantity={updateACotarItemQuantity} updateSupplierCost={updateSupplierCost}
        removeItem={removeACotarItem} updateItemMarkup={updateItemMarkup}
        forceItemSupplier={forceItemSupplier}
        toggleExcludeFromPurchasing={toggleExcludeFromPurchasing}
        userRole={user?.role}
        handleReallocate={(id, qty) => handleReallocate(id, qty, stockProducts)}
        getFreeStock={identifier => getFreeStock(identifier, stockProducts)}
        protocolId={protocolIdRef.current}
      />

      <FooterAcoes
        totals={totals} canFinalize={canFinalize}
        allItemsCount={countUniqueProtocolItems(allItems)}
        isViewing={false} protocolStatus="nao_reservado"
        isLoading={isFinalizing} canSendToBling={false}
        onSaveDraft={() => triggerSaveCheck('draft')}
        onReservar={() => triggerSaveCheck('reservar')}
        onEnviarBling={() => {}} onCancelar={handleCancelar} onEstornar={() => {}}
      />

      <ModalAvisoDuplo isOpen={showReallocModal} onClose={() => setShowReallocModal(false)}
        reallocatableItems={reallocatableItems} onConfirmRealloc={handleConfirmRealloc}
        onConfirmIgnore={handleConfirmIgnore} isLoading={isFinalizing} />

      <ModalDivisaoEstoque isOpen={splitModalState.isOpen}
        onClose={() => setSplitModalState(prev => ({ ...prev, isOpen: false }))}
        requestedQty={splitModalState.requestedQty} maxStock={splitModalState.maxStock}
        itemName={splitModalState.item?.name || ''} onConfirm={handleConfirmSplit} />

      <ModalDeficitEstoque isOpen={showDeficitModal} deficitItems={insufficientStockItems}
        onConfirm={handleConfirmDeficit} onClose={() => setShowDeficitModal(false)}
        isLoading={isFinalizing} />

      <ModalCancelar isOpen={showCancelModal} onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelar} isLoading={isFinalizing} />
    </section>
  );
}
