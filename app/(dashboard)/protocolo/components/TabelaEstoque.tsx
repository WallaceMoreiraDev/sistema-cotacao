import type { ProtocolItem } from '../../../lib/types/database';
import { formatCurrency, formatMeasurement } from '../../../lib/utils/protocolFormatters';

interface TabelaEstoqueProps {
  items: ProtocolItem[];
  updateQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  getFreeStock: (identifier: string) => number;
  onExceedStock: (item: ProtocolItem, requestedQty: number, maxTotalQty: number) => void;
  isViewing?: boolean;
}

export function TabelaEstoque({ items, updateQuantity, removeItem, getFreeStock, onExceedStock, isViewing = false }: TabelaEstoqueProps) {
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
      <div className="overflow-x-auto">
        <fieldset disabled={isViewing}>
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">#</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Nome</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">Código</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">D.Int</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">D.Ext</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]">A1</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">Qtd</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-right">Custo</th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-center">
                  <span className="inline-flex items-center gap-1">
                    Markup
                    <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                </th>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px] text-right">Preço Venda</th>
                <th className="px-4 py-2.5 text-[10px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 text-slate-500">{item.code || '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatMeasurement(item.measurements?.innerDiameter)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatMeasurement(item.measurements?.outerDiameter)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatMeasurement(item.measurements?.height1)}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val) || val < 1) return;
                        
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
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.costPrice ?? 0)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      70%
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency((item.costPrice ?? 0) * 1.7 * item.quantity)}</td>
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
              ))}
            </tbody>
          </table>
        </fieldset>
      </div>
    </div>
  );
}
