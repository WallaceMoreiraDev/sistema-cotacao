import { useState, useMemo } from 'react';
import { MEASUREMENT_FIELDS, ItemFormState } from '../../../lib/config/protocolForm';
import type { SealType, StockProduct } from '../../../lib/types/database';
import { filterStockByForm } from '../../../lib/services/stockService';
import { formatMeasurement } from '../../../lib/utils/protocolFormatters';

interface FormularioAdicaoItemProps {
  itemForm: ItemFormState;
  updateItemField: (field: keyof ItemFormState, value: string) => void;
  updateMeasurement: (key: keyof ItemFormState['measurements'], value: string) => void;
  filteredSealTypes: SealType[];
  isValidSealType: boolean;
  isItemFormValid: boolean;
  isFormUnlocked: boolean;
  handleAddItem: (stockProducts: StockProduct[], isValid: boolean) => void;
  addFeedback: string | null;
  stockProducts: StockProduct[];
  stockLoading: boolean;
  allItemsCount: number;
  getFreeStock: (identifier: string, stockProducts: StockProduct[]) => number;
  isViewing?: boolean;
}

export function FormularioAdicaoItem({
  itemForm,
  updateItemField,
  updateMeasurement,
  filteredSealTypes,
  isValidSealType,
  isItemFormValid,
  isFormUnlocked,
  handleAddItem,
  addFeedback,
  stockProducts,
  stockLoading,
  allItemsCount,
  getFreeStock,
  isViewing = false,
}: FormularioAdicaoItemProps) {
  const [isSealDropdownOpen, setIsSealDropdownOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  const stockSearchResults = useMemo(() => {
    return filterStockByForm(stockProducts, stockSearchQuery, itemForm).slice(0, 10);
  }, [stockProducts, stockSearchQuery, itemForm]);

  const handleFillForm = (product: StockProduct) => {
    updateItemField('name', product.name);
    updateItemField('code', product.code || '');
    updateItemField('oem', product.sku || '');
    updateItemField('quantity', '1');
    if (product.measurements) {
      if (product.measurements.innerDiameter !== undefined) updateMeasurement('innerDiameter', String(product.measurements.innerDiameter));
      if (product.measurements.outerDiameter !== undefined) updateMeasurement('outerDiameter', String(product.measurements.outerDiameter));
      if (product.measurements.height1 !== undefined) updateMeasurement('height1', String(product.measurements.height1));
      if (product.measurements.height2 !== undefined) updateMeasurement('height2', String(product.measurements.height2));
      if (product.measurements.thickness !== undefined) updateMeasurement('thickness', String(product.measurements.thickness));
      if (product.measurements.cs !== undefined) updateMeasurement('cs', String(product.measurements.cs));
    }
  };

  if (isViewing) return null;

  return (
    <>
      {stockLoading && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 animate-spin text-[#F7C00C]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-slate-800">Carregando estoque...</p>
              <p className="text-xs text-slate-500">Consultando base de dados para referência local</p>
            </div>
          </div>
        </div>
      )}

      {!stockLoading && (
        <div className="relative">
          {!isFormUnlocked && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-[2px]">
              <div className="text-center">
                <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="mt-2 text-sm font-semibold text-slate-600">Preencha o nome do cliente para começar</p>
              </div>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            {/* Form */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Adicionar Item</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                  {allItemsCount} {allItemsCount === 1 ? 'item' : 'itens'} adicionados
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="col-span-2 sm:col-span-1 relative">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                    <span>Nome / Tipo *</span>
                    {itemForm.name.trim() && !isValidSealType && (
                      <span className="text-[9px] text-red-500 font-normal">Inválido</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onFocus={() => setIsSealDropdownOpen(true)}
                    onChange={(e) => {
                      updateItemField('name', e.target.value);
                      setIsSealDropdownOpen(true);
                    }}
                    onBlur={() => setTimeout(() => setIsSealDropdownOpen(false), 200)}
                    placeholder="Selecione um tipo..."
                    className={`w-full rounded-lg border px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition ${
                      itemForm.name.trim() && !isValidSealType
                        ? 'border-red-300 bg-red-50/50 focus:border-red-500'
                        : 'border-slate-200 bg-slate-50 focus:border-slate-400 focus:bg-white'
                    }`}
                  />

                  {isSealDropdownOpen && filteredSealTypes.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                      <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Vedações Cadastradas</p>
                      {filteredSealTypes.map((sealType) => (
                        <button
                          key={sealType.id}
                          type="button"
                          onMouseDown={() => {
                            updateItemField('name', sealType.name);
                            setIsSealDropdownOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                          <span className="font-semibold">{sealType.name}</span>
                          {sealType.category && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">{sealType.category}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {itemForm.name.trim() && !isValidSealType && (
                    <p className="mt-1 text-[9px] text-red-500 leading-tight">Selecione um tipo válido</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Ref. / Cód. OEM</label>
                  <input
                    type="text"
                    value={itemForm.oem}
                    onChange={(e) => updateItemField('oem', e.target.value)}
                    placeholder="GX-001"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Apelido / Perfil</label>
                  <input
                    type="text"
                    value={itemForm.nickname}
                    onChange={(e) => updateItemField('nickname', e.target.value)}
                    placeholder="Gaxeta"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Código</label>
                  <input
                    type="text"
                    value={itemForm.code}
                    onChange={(e) => updateItemField('code', e.target.value)}
                    placeholder="GX-50x65x10"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Quantidade *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={itemForm.quantity}
                    onChange={(e) => updateItemField('quantity', e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Medidas (mm) *</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {MEASUREMENT_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="block text-[9px] font-medium text-slate-400 mb-0.5">{field.label}</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={itemForm.measurements[field.key]}
                          onChange={(e) => updateMeasurement(field.key, e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 pr-8 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">{field.suffix}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleAddItem(stockProducts, isItemFormValid);
                      setStockSearchQuery('');
                    }}
                    disabled={!isItemFormValid || !isFormUnlocked}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F7C00C] px-5 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition-all hover:bg-[#E8B600] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar Item
                  </button>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={itemForm.ignoreStock}
                        onChange={(e) => updateItemField('ignoreStock', e.target.checked as any)}
                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 bg-white transition-all checked:border-brand checked:bg-brand hover:border-brand/50"
                      />
                      <svg className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-slate-900 opacity-0 transition-opacity peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Ignorar estoque local</span>
                  </label>
                </div>

                {addFeedback && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-[11px] font-medium text-blue-700 animate-in slide-in-from-left-2">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {addFeedback}
                  </span>
                )}
              </div>
            </div>

            {/* Stock Search Sidebar */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Busca no Estoque</h3>
                <span className="text-[9px] text-slate-400">Filtrando pelos campos</span>
              </div>
              <input
                type="text"
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                placeholder="Busca rápida ou digite nos campos..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white mb-3"
              />

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {stockSearchResults.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-4 leading-relaxed">
                    Preencha Nome, Código ou Medidas nos campos do formulário para encontrar itens em estoque.
                  </p>
                )}
                {stockSearchResults.map((product) => {
                  const identifier = product.code || product.sku || product.name;
                  const freeStock = getFreeStock(identifier, stockProducts);
                  return (
                    <div
                      key={product.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition hover:border-slate-300 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{product.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{product.code} · {product.sku}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            freeStock > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            {freeStock > 0 ? `${freeStock} un.` : 'Sem estoque'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleFillForm(product)}
                            className="text-[9px] font-semibold text-brand hover:text-brand-dark flex items-center gap-1 transition-colors mt-1"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Preencher
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <span className="text-[9px] text-slate-400">Int: {formatMeasurement(product.measurements?.innerDiameter)}</span>
                        <span className="text-[9px] text-slate-400">Ext: {formatMeasurement(product.measurements?.outerDiameter)}</span>
                        <span className="text-[9px] text-slate-400">Alt 1: {formatMeasurement(product.measurements?.height1)}</span>
                        <span className="text-[9px] text-slate-400">Alt 2: {formatMeasurement(product.measurements?.height2)}</span>
                        <span className="text-[9px] text-slate-400">Esp: {formatMeasurement(product.measurements?.thickness)}</span>
                        <span className="text-[9px] text-slate-400">CS: {formatMeasurement(product.measurements?.cs)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
