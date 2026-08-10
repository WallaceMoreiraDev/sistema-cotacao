import { useState } from 'react';
import type { ProtocolItem } from '../../../lib/types/database';
import type { SupplierRow } from '../../../lib/actions/suppliers';
import { formatCurrency, formatMeasurement } from '../../../lib/utils/protocolFormatters';
import { getDefaultMarkup } from '../../../lib/config/suppliers';

interface TabelaCotacaoProps {
  items: ProtocolItem[];
  suppliers: SupplierRow[];
  estoqueItemsCount: number;
  updateQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  updateItemMarkup: (itemId: string, value: string) => void;
  handleReallocate: (id: string, maxQty: number) => void;
  getFreeStock: (identifier: string) => number;
  isViewing?: boolean;
}

export function TabelaCotacao({
  items,
  suppliers,
  estoqueItemsCount,
  updateQuantity,
  removeItem,
  updateItemMarkup,
  handleReallocate,
  getFreeStock,
  isViewing = false,
}: TabelaCotacaoProps) {
  const [unlockedItems, setUnlockedItems] = useState<Set<string>>(new Set());

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
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </span>
      </div>
      
      <div className="p-4 space-y-4">
        <fieldset disabled={isViewing} className="space-y-4">
          {items.map((item, index) => {
            const freeStock = getFreeStock(item.code || item.oem || item.name);
            const canReallocate = freeStock > 0;
            const isApproved = item.approvalStatus === 'approved';
            const isRejected = item.approvalStatus === 'rejected';
            const isLocked = isApproved || isRejected;
            const isUnlocked = unlockedItems.has(item.id);
            const disableMarkup = isViewing || (!isUnlocked && isLocked);

            return (
              <div key={item.id} className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-shadow hover:shadow-md">
                
                {/* 1. CABEÇALHO DO ITEM */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 border-b border-slate-200 gap-4">
                  
                  {/* Left: Identificação */}
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 font-bold text-sm">#{index + 1 + estoqueItemsCount}</span>
                    <div>
                      <div className="font-bold text-slate-800 text-sm leading-tight flex flex-wrap items-center gap-2">
                        {item.name}
                        {item.brand && <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 text-[10px]">Marca: {item.brand}</span>}
                        {item.oem && <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 text-[10px]">OEM: {item.oem}</span>}
                      </div>
                      {item.code && <div className="text-xs text-slate-500 mt-0.5 font-medium">Cód: {item.code}</div>}
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
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                        className="w-16 rounded border border-slate-300 py-1 px-2 text-sm text-center text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    {!isViewing && (
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
                    {suppliers.map(sup => (
                      <div key={sup.id} className="flex flex-col w-28 shrink-0">
                        <label className="text-[11px] font-semibold text-slate-700 truncate" title={sup.name}>
                          {sup.name}
                        </label>
                        <span className="text-[9px] text-slate-400 mb-1">{sup.type === 'Fornecedor Original' ? '(F. Orig)' : '(M. Loc)'}</span>
                        <input
                          type="number"
                          placeholder="R$ 0,00"
                          value={''}
                          onChange={() => {}}
                          className={`w-full rounded border py-1.5 px-2 text-sm text-center text-slate-900 transition-colors focus:ring-1 focus:outline-none border-slate-200`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. RESULTADOS E MARGINS */}
                <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-col md:flex-row items-center justify-between gap-4">
                  
                  {/* Left: Vencedor e Alertas */}
                  <div className="flex items-center gap-3">
                    <div className="text-[11px] text-slate-400 font-medium italic">Nenhum custo informado</div>                    {canReallocate && (
                      <button
                        type="button"
                        onClick={() => handleReallocate(item.id, freeStock)}
                        className="text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded border border-amber-200 transition-colors"
                      >
                        Aproveitar {freeStock} un. Estoque
                      </button>
                    )}
                  </div>

                  {/* Right: Financeiro */}
                  <div className="flex flex-col md:flex-row items-end md:items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          Markup %
                        </label>
                        {(item.needsApproval || isRejected) && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isApproved ? 'bg-emerald-100 text-emerald-700' : isRejected ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isApproved ? '✅ Aprovado' : isRejected ? '❌ Rejeitado' : '⚠️ Requer Aprovação'}
                          </span>
                        )}
                      </div>
                      <div className="relative group">
                        <input
                          type="number"
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
