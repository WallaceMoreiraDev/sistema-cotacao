import { useState } from 'react';
import type { ProtocolItem, StockProduct } from '../../../lib/types/database';
import type { SupplierRow } from '../../../lib/actions/suppliers';
import { formatCurrency, formatMeasurement, areItemsMatching } from '../../../lib/utils/protocolFormatters';
import { getDefaultMarkup } from '../../../lib/config/suppliers';
import { exportProtocolToExcel } from '../../../lib/utils/exportExcel';

interface TabelaCotacaoProps {
  items: ProtocolItem[];
  suppliers: SupplierRow[];
  estoqueItemsCount: number;
  updateQuantity: (id: string, qty: number) => void;
  updateSupplierCost: (itemId: string, supplierId: string, cost: number) => void;
  removeItem: (id: string) => void;
  updateItemMarkup: (itemId: string, value: string) => void;
  handleReallocate: (id: string, maxQty: number) => void;
  getFreeStock: (identifier: string) => number;
  forceItemSupplier?: (itemId: string, supplierId: string | null) => void;
  toggleExcludeFromPurchasing?: (itemId: string) => void;
  userRole?: string;
  isViewing?: boolean;
  protocolId?: string | number;
  stockProducts?: StockProduct[];
  onEditItem?: (item: ProtocolItem) => void;
}

export function TabelaCotacao({
  items,
  suppliers,
  estoqueItemsCount,
  updateQuantity,
  updateSupplierCost,
  removeItem,
  updateItemMarkup,
  handleReallocate,
  getFreeStock,
  forceItemSupplier,
  toggleExcludeFromPurchasing,
  userRole,
  isViewing = false,
  protocolId,
  stockProducts = [],
  onEditItem,
}: TabelaCotacaoProps) {
  const isAdmin = userRole === 'admin';
  const [unlockedItems, setUnlockedItems] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    await exportProtocolToExcel(items, undefined, protocolId);
    setIsExporting(false);
  };

  const handleUnlock = (id: string) => {
    setUnlockedItems(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  };

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200/80 bg-amber-50/50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Itens a Serem Cotados</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/50 hover:bg-amber-200/50 border border-amber-200 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Baixar Tabela para o Fornecedor"
          >
            {isExporting ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            Gerar Planilha
          </button>
          
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
            {items.length} {items.length === 1 ? 'item' : 'itens'}
          </span>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <fieldset disabled={isViewing} className="space-y-4">
          {items.map((item, index) => {
            const freeStock = getFreeStock(item.code || item.oem || item.name);
            const canReallocate = freeStock > 0;
            const isApproved = item.approvalStatus === 'approved';
            const isRejected = item.approvalStatus === 'rejected';
            // Lock only appears when the item actually went through an approval flow.
            // Normal-markup items (needsApproval=false) should never show any lock/badge.
            const isPurchased = item.status === 'comprado';
            const isLocked = item.needsApproval && (isApproved || isRejected);
            const isUnlocked = unlockedItems.has(item.id);
            const disableMarkup = isViewing || isPurchased || (!isUnlocked && isLocked);
            
            // Determinar o fornecedor mais barato
            let cheapestSupplierId: string | null = null;
            if (item.supplierCosts) {
              const validEntries = Object.entries(item.supplierCosts).filter(([_, v]) => v > 0);
              if (validEntries.length > 0) {
                const cheapest = validEntries.reduce((min, current) => current[1] < min[1] ? current : min);
                cheapestSupplierId = cheapest[0];
              }
            }

            // Determinar tipo de fornecedor vencedor para mostrar o placeholder
            let winnerType: 'Fornecedor Original' | 'Mercado Local' = 'Fornecedor Original';
            if (!item.costPrice && cheapestSupplierId) {
              const sup = suppliers.find(s => String(s.id) === cheapestSupplierId);
              if (sup && (sup.type === 'Fornecedor Original' || sup.type === 'Mercado Local')) {
                winnerType = sup.type;
              }
            }
            const expectedMarkup = getDefaultMarkup(winnerType);

            return (
              <div key={item.id} className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-shadow hover:shadow-md">
                
                {/* 1. CABEÇALHO DO ITEM */}
                <div className={`flex flex-col md:flex-row md:items-center justify-between p-4 border-b gap-4 transition-colors ${isPurchased ? 'bg-slate-100/50 opacity-80 border-slate-200' : 'bg-slate-50 border-slate-200'}`}>
                  
                  {/* Left: Identificação */}
                  <div className={`flex items-start gap-3 ${isPurchased ? 'opacity-60' : ''}`}>
                    <span className="text-slate-400 font-bold text-sm">#{index + 1 + estoqueItemsCount}</span>
                    <div>
                      <div className="font-bold text-slate-800 text-sm leading-tight flex flex-wrap items-center gap-2">
                        {item.name}
                        {isPurchased && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">✅ COMPRADO</span>}
                        {item.brand && <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 text-[10px]">Marca: {item.brand}</span>}
                        {item.oem && <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 text-[10px]">OEM: {item.oem}</span>}
                        {!item.productId && onEditItem && !isViewing && (
                          <button
                            onClick={() => onEditItem(item)}
                            className="p-1 text-slate-400 hover:text-brand transition-colors rounded hover:bg-slate-100"
                            title="Editar Item"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {item.code && <div className="text-xs text-slate-500 mt-0.5 font-medium">Cód: {item.code}</div>}
                      {item.observation && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 mt-1.5 italic shadow-sm w-fit">
                          <span className="font-semibold not-italic text-slate-700">Obs:</span> {item.observation}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Medidas */}
                  <div className="flex flex-wrap items-center gap-2 md:justify-center">
                    {item.measurements?.innerDiameter && <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600">D. Interno: {formatMeasurement(item.measurements.innerDiameter)}</span>}
                    {item.measurements?.outerDiameter && <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600">D. Externo: {formatMeasurement(item.measurements.outerDiameter)}</span>}
                    {item.measurements?.height1 && <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600">A1: {formatMeasurement(item.measurements.height1)}</span>}
                    {item.measurements?.height2 && <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600">A2: {formatMeasurement(item.measurements.height2)}</span>}
                    {item.measurements?.thickness && <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600">Espessura: {formatMeasurement(item.measurements.thickness)}</span>}
                    {item.measurements?.cs && <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600">C.S: {formatMeasurement(item.measurements.cs)}</span>}
                  </div>

                  {/* Right: Quantidade e Ações */}
                  <div className="flex items-center justify-between md:justify-end gap-4 min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">QTD</label>
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                        disabled={isViewing || isPurchased}
                        className="w-16 rounded border border-slate-300 py-1 px-2 text-sm text-center text-slate-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:opacity-50 disabled:bg-slate-100"
                      />
                    </div>
                    {!isViewing && !isPurchased && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-rose-400 hover:text-rose-600 transition-colors p-1"
                        title="Remover Item"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. ÁREA DE COTAÇÕES */}
                <div className="p-4 bg-white">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Custos por Fornecedor (R$)</h4>
                  <div className="flex flex-wrap gap-4">
                    {suppliers.map(sup => {
                      const isCheapest = String(sup.id) === cheapestSupplierId && !item.costPrice;
                      
                      return (
                        <div key={sup.id} className="flex flex-col w-28 shrink-0 relative">
                          <label className={`text-[11px] font-semibold truncate ${isCheapest ? 'text-emerald-700' : 'text-slate-700'}`} title={sup.name}>
                            {sup.name}
                          </label>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[9px] ${isCheapest ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                              {sup.type === 'Fornecedor Original' ? '(F. Orig)' : '(M. Loc)'}
                              {isCheapest && !item.forcedSupplierId && ' 🏆'}
                              {item.forcedSupplierId === String(sup.id) && ' 🔒'}
                            </span>
                            
                            {isAdmin && !item.costPrice && !isViewing && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (forceItemSupplier) {
                                    forceItemSupplier(item.id, item.forcedSupplierId === String(sup.id) ? null : String(sup.id));
                                  }
                                }}
                                title={item.forcedSupplierId === String(sup.id) ? 'Remover trava' : 'Forçar este fornecedor'}
                                className={`text-[10px] p-0.5 rounded transition ${item.forcedSupplierId === String(sup.id) ? 'text-brand bg-brand/10 hover:bg-brand/20' : 'text-slate-400 hover:bg-slate-100'}`}
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <input
                            type="number"
                            placeholder="R$ 0,00"
                            value={item.supplierCosts?.[sup.id] || ''}
                            onChange={(e) => updateSupplierCost(item.id, String(sup.id), parseFloat(e.target.value))}
                            disabled={isViewing || isPurchased}
                            className={`w-full rounded border py-1.5 px-2 text-sm text-center transition-colors focus:ring-1 focus:outline-none ${isCheapest || item.forcedSupplierId === String(sup.id) ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-emerald-500' : 'border-slate-200 text-slate-900 bg-white'} disabled:opacity-60`}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 3. RESULTADOS E MARGINS */}
                <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-col md:flex-row items-center justify-between gap-4">
                  
                  {/* Left: Vencedor e Alertas */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        {item.costPrice && item.costPrice > 0 ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded flex items-center gap-1 border border-amber-200 shadow-sm w-fit">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            Venda travada pelo custo do estoque
                          </span>
                        ) : (
                          <div className="text-[11px] text-slate-400 font-medium italic">Sem custo base travado</div>
                        )}
                        
                        {canReallocate && (
                          <button
                            type="button"
                            onClick={() => handleReallocate(item.id, freeStock)}
                            className="text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded border border-amber-200 transition-colors"
                          >
                            Aproveitar {freeStock} un. Estoque
                          </button>
                        )}
                      </div>

                      {(() => {
                        const originalProduct = stockProducts.find(p => areItemsMatching(p as any, item as any));
                        const originalSupplier = originalProduct ? suppliers.find(s => String(s.id) === String(originalProduct.supplierId)) : undefined;
                        const hasCost = originalProduct && !!originalProduct.costPrice && originalProduct.costPrice > 0;
                        
                        return (
                          <div className="flex items-center gap-1.5 text-[10px] bg-white border border-slate-200 px-2 py-1 rounded shadow-sm w-fit mt-0.5">
                            <span className="font-semibold text-slate-500">Custo Ref. Catálogo:</span>
                            <span className="text-slate-700 font-bold">{hasCost ? formatCurrency(originalProduct!.costPrice) : '-'}</span>
                            <span className="text-slate-300 mx-0.5">|</span>
                            <span className="font-semibold text-slate-500">Fornecedor Padrão:</span>
                            <span className={originalSupplier ? "text-slate-700 font-bold" : "text-slate-400 italic"}>
                              {originalSupplier ? originalSupplier.name : 'Não informado'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Right: Ações Rápidas — wrapped in its own fieldset to escape parent disabled */}
                    <fieldset disabled={false} className="contents">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors px-2 py-1 rounded border border-slate-200">
                          <input
                            type="checkbox"
                            checked={!!item.excludeFromPurchasing}
                            onChange={() => toggleExcludeFromPurchasing && toggleExcludeFromPurchasing(item.id)}
                            disabled={isPurchased}
                            className="rounded border-slate-300 text-brand focus:ring-brand"
                          />
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Excluir da Lista Geral</span>
                        </label>
                      </div>
                    </fieldset>
                  </div>

                  {/* Right: Financeiro */}
                  <div className="flex flex-col md:flex-row items-end md:items-center gap-4 md:gap-6">
                    {isAdmin && item.finalTotal && item.finalTotal > 0 && (
                      <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200/60 shadow-sm text-[9px] text-slate-500 hidden xl:flex">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-400 uppercase">Custo Forn. Total</span>
                          <span className="text-slate-700 font-medium">{formatCurrency((item.unitPrice || 0) * Number(item.quantity))}</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-400 uppercase">Sub. Base (Venda)</span>
                          <span className="text-slate-700 font-medium">{formatCurrency(item.baseSubtotal || 0)}</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-400 uppercase">+ Imposto</span>
                          <span className="text-rose-600 font-medium">{formatCurrency(item.taxAmount || 0)}</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-400 uppercase">+ Frete</span>
                          <span className="text-amber-600 font-medium">{formatCurrency(item.freightAmount || 0)}</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-400 uppercase">= Final</span>
                          <span className="text-brand font-bold">{formatCurrency(item.finalTotal || 0)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          Markup %
                        </label>
                        {item.needsApproval && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isApproved ? 'bg-emerald-100 text-emerald-700' : isRejected ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isApproved ? '✅ Aprovado' : isRejected ? '❌ Rejeitado' : '⚠️ Requer Aprovação'}
                          </span>
                        )}
                      </div>
                      <div className="relative group">
                        <input
                          type="number"
                          placeholder={`Padrão: ${expectedMarkup}%`}
                          value={item.markupPercent ?? ''}
                          onChange={(e) => updateItemMarkup(item.id, e.target.value)}
                          disabled={disableMarkup}
                          className={`w-16 h-10 rounded border py-1.5 px-2 text-sm text-center font-bold text-slate-900 ${
                            (item.needsApproval || isRejected)
                              ? isApproved
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-emerald-500 cursor-not-allowed'
                                : isRejected
                                ? 'border-red-300 bg-red-50 text-red-800 focus:ring-red-500 cursor-not-allowed'
                                : 'border-amber-400 bg-amber-50 text-amber-900 focus:ring-amber-500'
                              : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                          } ${disableMarkup ? 'opacity-80' : ''}`}
                        />
                        {isLocked && !isUnlocked && !isViewing && (
                          <button
                            type="button"
                            onClick={() => handleUnlock(item.id)}
                            className={`absolute -right-2 -top-2 text-white rounded-full p-0.5 transition-colors shadow-sm z-10 cursor-pointer ${isApproved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                            title={isApproved ? "Desbloquear Markup (Aprovado)" : "Desbloquear Markup (Rejeitado)"}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 text-right">Preço Un.</div>
                        <div className="text-sm font-semibold text-slate-600">{formatCurrency(item.salePrice || 0)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 text-right">Total Venda</div>
                        <div className="text-sm font-black text-slate-900">{formatCurrency((item.salePrice || 0) * item.quantity)}</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </fieldset>
      </div>
    </div>
  );
}
