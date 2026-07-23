import { useState } from 'react';
import type { ProtocolItem } from '../../../lib/types/database';
import type { SupplierRow } from '../../../lib/actions/suppliers';
import { formatCurrency, formatMeasurement } from '../../../lib/utils/protocolFormatters';

interface TabelaCotacaoProps {
  items: ProtocolItem[];
  suppliers: SupplierRow[];
  estoqueItemsCount: number;
  updateQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  updateSupplierPrice: (itemId: string, supplierId: string, value: string) => void;
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
  updateSupplierPrice,
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
      <div className="overflow-x-auto">
        <fieldset disabled={isViewing}>
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">#</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Nome</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Código</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">D.Int</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">D.Ext</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">A1</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">A2</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Esp.</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">C.S.</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">Qtd</th>
                {suppliers.map((s) => (
                  <th key={s.id} className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">
                    <div className="flex flex-col items-center">
                      <span>{s.name}</span>
                      <span className="text-[8px] opacity-70 font-medium">
                        {s.type === 'Fornecedor Original' ? '(Orig)' : '(Loc)'}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center bg-emerald-50/50">Vencedor</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center bg-emerald-50/50">Markup %</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-right bg-emerald-50/50">Preço Un.</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-right bg-emerald-50/50">Total Venda</th>
                {!isViewing && <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item, index) => {
                const freeStock = getFreeStock(item.code || item.oem || item.name);
                const canReallocate = freeStock > 0;
                const isApproved = item.approvalStatus === 'approved';
                const isUnlocked = unlockedItems.has(item.id);
                const disableMarkup = (isApproved && !isUnlocked) || isViewing;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-3 py-2 text-slate-400 font-medium">{index + 1 + estoqueItemsCount}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{item.name}</span>
                        {(item.brand || item.oem) && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {item.brand && <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded font-semibold">Marca: {item.brand}</span>}
                            {item.oem && <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded font-semibold">OEM: {item.oem}</span>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600 font-medium">{item.code || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{formatMeasurement(item.measurements.dInt)}</td>
                    <td className="px-3 py-2 text-slate-600">{formatMeasurement(item.measurements.dExt)}</td>
                    <td className="px-3 py-2 text-slate-600">{formatMeasurement(item.measurements.a1)}</td>
                    <td className="px-3 py-2 text-slate-600">{formatMeasurement(item.measurements.a2)}</td>
                    <td className="px-3 py-2 text-slate-600">{formatMeasurement(item.measurements.esp)}</td>
                    <td className="px-3 py-2 text-slate-600">{formatMeasurement(item.measurements.cs)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                        className="w-16 rounded border border-slate-300 py-1 px-1.5 text-xs text-center text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </td>
                    {suppliers.map(sup => (
                      <td key={sup.id} className="px-3 py-2">
                        <input
                          type="number"
                          placeholder="0,00"
                          value={item.supplierPrices?.[sup.id] || ''}
                          onChange={(e) => updateSupplierPrice(item.id, sup.id, e.target.value)}
                          className={`w-20 rounded border py-1 px-1.5 text-xs text-center text-slate-900 transition-colors focus:ring-1 focus:outline-none ${
                            item.chosenSupplier === sup.id 
                              ? 'border-emerald-500 bg-emerald-50/50 ring-emerald-500 font-bold' 
                              : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500'
                          }`}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center bg-emerald-50/30">
                      {item.chosenSupplier ? (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            {suppliers.find(s => s.id === item.chosenSupplier)?.name || item.chosenSupplier}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic font-medium">Nenhum</span>
                      )}
                    </td>
                    <td className="px-3 py-2 bg-emerald-50/30 text-center">
                      <div className="relative inline-block">
                        <input
                          type="number"
                          value={item.markupPercent ?? ''}
                          onChange={(e) => updateItemMarkup(item.id, e.target.value)}
                          disabled={disableMarkup}
                          className={`w-14 rounded border py-1 px-1.5 text-xs text-center font-bold text-slate-900 ${
                            item.needsApproval
                              ? isApproved
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-emerald-500 cursor-not-allowed'
                                : 'border-amber-300 bg-amber-50 text-amber-800 focus:ring-amber-500'
                              : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                          } ${disableMarkup ? 'opacity-80' : ''}`}
                        />
                        {isApproved && !isUnlocked && !isViewing && (
                          <button
                            type="button"
                            onClick={() => handleUnlock(item.id)}
                            className="absolute -right-1.5 -top-1.5 bg-emerald-500 text-white rounded-full p-0.5 hover:bg-emerald-600 transition-colors shadow-sm z-10 cursor-pointer"
                            title="Desbloquear Markup"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700 bg-emerald-50/30">
                      {formatCurrency(item.salePrice || 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-black text-slate-900 bg-emerald-50/30">
                      {formatCurrency((item.salePrice || 0) * item.quantity)}
                    </td>
                    {!isViewing && (
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col items-center gap-1.5">
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
                          {canReallocate && (
                            <button
                              type="button"
                              onClick={() => handleReallocate(item.id, freeStock)}
                              className="text-[9px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 transition-colors"
                              title={`Temos ${freeStock} un. no estoque que podem ser usadas!`}
                            >
                              Aproveitar {freeStock} un. Estoque
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </fieldset>
      </div>
    </div>
  );
}
