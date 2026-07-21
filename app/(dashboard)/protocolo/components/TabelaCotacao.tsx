import type { ProtocolItem } from '../../../lib/types/database';
import { formatCurrency, formatMeasurement } from '../../../lib/utils/protocolFormatters';
import { SUPPLIERS, getSupplierById, getDefaultMarkup } from '../../../lib/config/suppliers';

interface TabelaCotacaoProps {
  items: ProtocolItem[];
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
  estoqueItemsCount,
  updateQuantity,
  removeItem,
  updateSupplierPrice,
  updateItemMarkup,
  handleReallocate,
  getFreeStock,
  isViewing = false,
}: TabelaCotacaoProps) {
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
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">#</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Nome</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Código</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">D.Int</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">D.Ext</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">Qtd</th>
                {SUPPLIERS.map((s) => (
                  <th key={s.id} className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">
                    <div className="flex flex-col items-center">
                      <span>{s.name}</span>
                      <span className="text-[8px] font-normal text-slate-400 normal-case">
                        {s.type === 'original' ? 'Fornecedor Original' : 'Mercado Local'}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">Escolhido</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">Markup %</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-right">Preço Venda</th>
                <th className="px-3 py-2.5 text-[10px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const defaultMk = item.chosenSupplierType ? getDefaultMarkup(item.chosenSupplierType) : null;
                const isCustomMarkup = item.needsApproval === true;
                const identifier = item.code || item.oem || item.name;
                const freeStock = getFreeStock(identifier);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-3 py-3 font-mono font-bold text-slate-400">{estoqueItemsCount + idx + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        {freeStock > 0 && !isViewing && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700 border border-red-200 animate-pulse whitespace-nowrap">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Estoque Liberado ({freeStock} un.)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleReallocate(item.id, freeStock)}
                              className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                            >
                              Remanejar
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{item.code || '-'}</td>
                    <td className="px-3 py-3 text-slate-500">{formatMeasurement(item.measurements?.innerDiameter)}</td>
                    <td className="px-3 py-3 text-slate-500">{formatMeasurement(item.measurements?.outerDiameter)}</td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-center text-xs font-semibold text-slate-800 outline-none transition focus:border-amber-400 disabled:opacity-60 disabled:bg-slate-50"
                      />
                    </td>
                    {SUPPLIERS.map((s) => {
                      const isChosen = item.chosenSupplier === s.id;
                      return (
                        <td key={s.id} className="px-2 py-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.supplierPrices?.[s.id] || ''}
                            onChange={(e) => updateSupplierPrice(item.id, s.id, e.target.value)}
                            placeholder="R$"
                            className={`w-full rounded-lg border px-2 py-1.5 text-xs text-center outline-none transition ${
                              isChosen
                                ? 'border-emerald-300 bg-emerald-50 font-bold text-emerald-800 ring-1 ring-emerald-200'
                                : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400 focus:bg-white'
                            } disabled:opacity-60 disabled:bg-slate-50`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center">
                      {item.chosenSupplier ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {getSupplierById(item.chosenSupplier)?.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="999"
                          step="1"
                          value={item.markupPercent ?? ''}
                          onChange={(e) => updateItemMarkup(item.id, e.target.value)}
                          disabled={!item.chosenSupplier || isViewing}
                          className={`w-full rounded-lg border px-2 py-1.5 pr-6 text-xs text-center outline-none transition ${
                            isCustomMarkup
                              ? 'border-amber-300 bg-amber-50/80 text-amber-800 ring-1 ring-amber-200'
                              : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400 focus:bg-white'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                        {isCustomMarkup && (
                          <div className="group absolute -top-1 -right-1">
                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white cursor-help">
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-20">
                              <div className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] text-white shadow-lg whitespace-nowrap">
                                <p className="font-bold">Markup personalizado</p>
                                <p className="mt-0.5 text-slate-300">
                                  Padrão para {item.chosenSupplierType === 'original' ? 'Fornecedor Original' : 'Mercado Local'}: <strong>{defaultMk}%</strong>
                                </p>
                                <p className="mt-0.5 text-amber-300">Este item requer aprovação.</p>
                                <div className="absolute bottom-0 right-3 translate-y-1/2 rotate-45 h-2 w-2 bg-slate-900" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900">
                      {(item.salePrice ?? 0) > 0
                        ? formatCurrency((item.salePrice ?? 0) * item.quantity)
                        : <span className="text-slate-400">R$ 0,00</span>
                      }
                    </td>
                    <td className="px-3 py-3">
                      {!isViewing && (
                        <button type="button" onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 transition">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
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
