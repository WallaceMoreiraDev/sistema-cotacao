import React from 'react';
import type { ProtocolItem, StockProduct, Supplier } from '../../../lib/types/database';
import { formatCurrency, formatMeasurement } from '../../../lib/utils/protocolFormatters';

interface TabelaEstoqueProps {
  items: ProtocolItem[];
  updateQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  getFreeStock: (identifier: string) => number;
  onExceedStock: (item: ProtocolItem, requestedQty: number, maxTotalQty: number) => void;
  isViewing?: boolean;
  stockProducts?: StockProduct[];
  suppliers?: Supplier[];
  userRole?: string;
}

export function TabelaEstoque({ items, updateQuantity, removeItem, getFreeStock, onExceedStock, isViewing = false, stockProducts = [], suppliers = [], userRole }: TabelaEstoqueProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200/80 bg-emerald-50/50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Itens em Estoque</h2>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </span>
      </div>
      <div className="overflow-hidden">
        <fieldset disabled={isViewing}>
          
          {/* Tabela Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">#</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Nome</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Código</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">D.Int</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">D.Ext</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">A1</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">A2</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Esp.</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">C.S.</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">Qtd</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-right">Preço Un.</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-right">Preço Total Venda</th>
                  <th className="px-4 py-2.5 text-[10px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <React.Fragment key={item.id}>
                  <tr className="hover:bg-slate-50/60 transition border-b-0">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400 border-b-0">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        {(item.brand || item.oem || item.nickname || item.measurements?.location) && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[9px]">
                            {item.brand && <span className="text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">Marca: {item.brand}</span>}
                            {item.oem && <span className="text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">OEM: {item.oem}</span>}
                            {item.nickname && <span className="text-slate-400 italic">"{item.nickname}"</span>}
                            {item.measurements?.location && (
                              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {item.measurements.location}
                              </span>
                            )}
                          </div>
                        )}
                        {item.observation && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 mt-1.5 italic shadow-sm w-fit">
                            <span className="font-semibold not-italic text-slate-700">Obs:</span> {item.observation}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{item.code || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatMeasurement(item.measurements?.innerDiameter)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatMeasurement(item.measurements?.outerDiameter)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatMeasurement(item.measurements?.height1)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatMeasurement(item.measurements?.height2)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatMeasurement(item.measurements?.thickness)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatMeasurement(item.measurements?.cs)}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (isNaN(val) || val <= 0) return;
                          
                          const identifier = item.code || item.oem || item.name;
                          const freeStock = getFreeStock(identifier);
                          const maxTotalQty = Number(item.quantity) + freeStock;

                          if (val > maxTotalQty) {
                            onExceedStock(item, val, maxTotalQty);
                          } else {
                            updateQuantity(item.id, val);
                          }
                        }}
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-center text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-400 disabled:opacity-60 disabled:bg-slate-50"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.salePrice ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {(item.salePrice ?? 0) > 0
                        ? formatCurrency((item.salePrice ?? 0) * item.quantity)
                        : <span className="text-slate-400">R$ 0,00</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {!isViewing && (
                        <button type="button" onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 transition">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50/10">
                    <td colSpan={13} className="px-4 pb-3 pt-1">
                      {item.finalTotal && item.finalTotal > 0 && (
                        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded border border-slate-200/60 shadow-sm text-[9px] text-slate-500 w-fit ml-auto">
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
                            <span className="text-amber-500 font-bold">{formatCurrency(item.finalTotal || 0)}</span>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 lg:hidden p-3 bg-slate-50/50">
            {items.map((item, idx) => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative flex flex-col gap-3">
                {!isViewing && (
                  <button 
                    type="button" 
                    onClick={() => removeItem(item.id)} 
                    className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition bg-slate-50 hover:bg-red-50 p-1.5 rounded-md"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                
                <div>
                  <div className="flex items-center gap-2 pr-8">
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">#{idx + 1}</span>
                    <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                  </div>
                  {(item.brand || item.oem || item.nickname || item.code || item.measurements?.location) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                      {item.code && <span className="text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">Cód: {item.code}</span>}
                      {item.brand && <span className="text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">Marca: {item.brand}</span>}
                      {item.oem && <span className="text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">OEM: {item.oem}</span>}
                      {item.nickname && <span className="text-slate-400 italic">"{item.nickname}"</span>}
                      {item.measurements?.location && (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {item.measurements.location}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-2.5 text-[10px] text-slate-600 border border-slate-100">
                  <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold">D.Int</span> <span className="font-medium text-slate-700">{formatMeasurement(item.measurements?.innerDiameter) || '-'}</span></div>
                  <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold">D.Ext</span> <span className="font-medium text-slate-700">{formatMeasurement(item.measurements?.outerDiameter) || '-'}</span></div>
                  <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold">A1</span> <span className="font-medium text-slate-700">{formatMeasurement(item.measurements?.height1) || '-'}</span></div>
                  <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold">A2</span> <span className="font-medium text-slate-700">{formatMeasurement(item.measurements?.height2) || '-'}</span></div>
                  <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold">Esp.</span> <span className="font-medium text-slate-700">{formatMeasurement(item.measurements?.thickness) || '-'}</span></div>
                  <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold">C.S.</span> <span className="font-medium text-slate-700">{formatMeasurement(item.measurements?.cs) || '-'}</span></div>
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-slate-100 mt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Qtd</span>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val <= 0) return;
                        
                        const identifier = item.code || item.oem || item.name;
                        const freeStock = getFreeStock(identifier);
                        const maxTotalQty = Number(item.quantity) + freeStock;

                        if (val > maxTotalQty) {
                          onExceedStock(item, val, maxTotalQty);
                        } else {
                          updateQuantity(item.id, val);
                        }
                      }}
                      className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-center text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-slate-500">Un: {formatCurrency(item.salePrice ?? 0)}</span>
                    <span className="text-sm font-black text-emerald-600">
                      {(item.salePrice ?? 0) > 0 ? formatCurrency((item.salePrice ?? 0) * item.quantity) : 'R$ 0,00'}
                    </span>
                  </div>
                </div>
                
                {item.finalTotal && item.finalTotal > 0 && userRole === 'admin' && (
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60 shadow-sm text-[9px] text-slate-500 w-full mt-2 justify-center">
                    <div className="flex flex-col text-center">
                      <span className="font-bold text-slate-400 uppercase">Forn. Total</span>
                      <span className="text-slate-700 font-medium">{formatCurrency((item.unitPrice || 0) * Number(item.quantity))}</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="flex flex-col text-center">
                      <span className="font-bold text-slate-400 uppercase">Sub. Venda</span>
                      <span className="text-slate-700 font-medium">{formatCurrency(item.baseSubtotal || 0)}</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="flex flex-col text-center">
                      <span className="font-bold text-slate-400 uppercase">+ Imp.</span>
                      <span className="text-rose-600 font-medium">{formatCurrency(item.taxAmount || 0)}</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="flex flex-col text-center">
                      <span className="font-bold text-slate-400 uppercase">+ Frete</span>
                      <span className="text-amber-600 font-medium">{formatCurrency(item.freightAmount || 0)}</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="flex flex-col text-center">
                      <span className="font-bold text-slate-400 uppercase">= Final</span>
                      <span className="text-amber-500 font-bold">{formatCurrency(item.finalTotal || 0)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

        </fieldset>
      </div>
    </div>
  );
}
