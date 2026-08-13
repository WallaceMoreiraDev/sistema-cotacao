import { useState, useMemo, useEffect } from 'react';
import { MEASUREMENT_FIELDS, ItemFormState, EMPTY_ITEM_FORM } from '../../../lib/config/protocolForm';
import type { StockProduct } from '../../../lib/types/database';
import { filterStockByForm } from '../../../lib/services/stockService';
import { formatMeasurement } from '../../../lib/utils/protocolFormatters';
import { ModalCriarItem } from './ModalCriarItem';

interface FormularioAdicaoItemProps {
  itemForm: ItemFormState;
  sealFamilies?: any[];
  updateItemField: (field: keyof ItemFormState, value: string | boolean) => void;
  updateMeasurement: (key: keyof ItemFormState['measurements'], value: string) => void;
  isItemFormValid: boolean;
  isFormUnlocked: boolean;
  handleAddItem: (stockProducts: StockProduct[], isValid: boolean) => void;
  handleAddStockItem?: (match: StockProduct, qty: number, ignoreStock: boolean) => void;
  handleCreateNewItem?: () => void;
  addFeedback: string | null;
  stockProducts: StockProduct[];
  stockLoading: boolean;
  allItemsCount: number;
  getFreeStock: (identifier: string, stockProducts: StockProduct[]) => number;
  isViewing?: boolean;
  onClearForm: () => void;
}

export function FormularioAdicaoItem({
  itemForm,
  sealFamilies = [],
  updateItemField,
  updateMeasurement,
  isItemFormValid,
  isFormUnlocked,
  handleAddItem,
  handleAddStockItem,
  handleCreateNewItem,
  addFeedback,
  stockProducts,
  stockLoading,
  allItemsCount,
  getFreeStock,
  isViewing = false,
  onClearForm,
}: FormularioAdicaoItemProps) {
  // ─── SEARCH STATES ───
  const [omniSearchQuery, setOmniSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<ItemFormState>(EMPTY_ITEM_FORM);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [localQuantities, setLocalQuantities] = useState<Record<string, string>>({});
  const [localIgnoreStock, setLocalIgnoreStock] = useState<Record<string, boolean>>({});

  const [isModalCriarOpen, setIsModalCriarOpen] = useState(false);

  const updateSearchFilter = (field: keyof ItemFormState, value: string | boolean) => {
    setSearchFilters(prev => ({ ...prev, [field]: value }));
  };

  const updateSearchMeasurement = (key: keyof ItemFormState['measurements'], value: string) => {
    setSearchFilters(prev => ({
      ...prev,
      measurements: { ...prev.measurements, [key]: value }
    }));
  };

  const handleClearSearch = () => {
    setOmniSearchQuery('');
    setSearchFilters(EMPTY_ITEM_FORM);
  };



  const stockSearchResults = useMemo(() => {
    // For now we map category to name for the stock search
    const legacyForm = { ...searchFilters, name: searchFilters.category };
    return filterStockByForm(stockProducts, omniSearchQuery, legacyForm as any).slice(0, 50);
  }, [stockProducts, omniSearchQuery, searchFilters]);

  const handleFillForm = (product: StockProduct) => {
    updateItemField('category', product.category || product.name);
    updateItemField('partType', product.part_type || '');
    updateItemField('supplierCode', product.sku || '');
    updateItemField('parkerCode', product.parker_code || '');
    updateItemField('oemCode', product.oem_code || '');
    updateItemField('brand', product.brand || '');
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

          <div className="grid gap-5 lg:grid-cols-[1fr_320px] items-start">
            {/* Form */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Busca no Estoque</h2>
                  {(omniSearchQuery || searchFilters.category || searchFilters.brand || searchFilters.supplierCode || Object.values(searchFilters.measurements).some(m => m !== '')) && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-800 font-bold uppercase transition"
                    >
                      Limpar Busca
                    </button>
                  )}
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                  {allItemsCount} {allItemsCount === 1 ? 'item' : 'itens'} adicionados
                </span>
              </div>
              
              {/* Omni-search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={omniSearchQuery}
                  onChange={(e) => setOmniSearchQuery(e.target.value)}
                  placeholder="Pesquise por nome, medida, material, marca ou código..."
                  className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:shadow-sm"
                />
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Advanced Filters Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
                >
                  <svg className={`h-4 w-4 transform transition-transform ${isAdvancedSearchOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {isAdvancedSearchOpen ? 'Ocultar Filtros Avançados' : 'Mostrar Filtros Avançados'}
                </button>
              </div>

              {/* Advanced Filters Form */}
              {isAdvancedSearchOpen && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-6 pt-2 border-t border-slate-100">
                  <div className="col-span-2 sm:col-span-2 relative">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Nome da Peça / Categoria
                    </label>
                    <select
                      value={searchFilters.category}
                      onChange={(e) => updateSearchFilter('category', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                    >
                      <option value="">Qualquer...</option>
                      {sealFamilies.map(f => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-4 mt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Medidas (mm)</p>
                    <div className="flex flex-wrap gap-2">
                      {MEASUREMENT_FIELDS.map((field) => (
                        <div key={field.key} className="w-20 flex-grow sm:flex-grow-0">
                          <label className="block text-[9px] font-medium text-slate-400 mb-0.5">{field.label}</label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={searchFilters.measurements[field.key]}
                              onChange={(e) => updateSearchMeasurement(field.key, e.target.value)}
                              placeholder="0.00"
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-2 pr-6 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white text-right"
                            />
                            <span className="absolute inset-y-0 right-2 flex items-center text-[8px] text-slate-400 font-medium pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-2 mt-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Tipo de Peça / Material</label>
                    <input
                      type="text"
                      value={searchFilters.partType}
                      onChange={(e) => updateSearchFilter('partType', e.target.value)}
                      placeholder="ex: PU 90 SH, NBR"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Cód. Referência Fornecedor</label>
                    <input
                      type="text"
                      value={searchFilters.supplierCode}
                      onChange={(e) => updateSearchFilter('supplierCode', e.target.value)}
                      placeholder="Código Original"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Cód. Ref. Parker Mundial</label>
                    <input
                      type="text"
                      value={searchFilters.parkerCode}
                      onChange={(e) => updateSearchFilter('parkerCode', e.target.value)}
                      placeholder="Ref. Parker"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Cód. OEM</label>
                    <input
                      type="text"
                      value={searchFilters.oemCode}
                      onChange={(e) => updateSearchFilter('oemCode', e.target.value)}
                      placeholder="OEM"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Marca do Produto</label>
                    <input
                      type="text"
                      value={searchFilters.brand}
                      onChange={(e) => updateSearchFilter('brand', e.target.value)}
                      placeholder="Agel, APC..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                </div>
              )}

                {addFeedback && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-[11px] font-medium text-blue-700 animate-in slide-in-from-left-2">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {addFeedback}
                  </span>
                )}
            </div>

            {/* Stock Search Sidebar */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Resultados da Busca</h3>
                <span className="text-[9px] text-slate-400">Exibindo itens do estoque</span>
              </div>

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
                          <div className="flex flex-col gap-0.5 mt-1 text-[9px] text-slate-500">
                            {product.category && product.category !== 'Desconhecida' && <p><strong>Categoria:</strong> {product.category}</p>}
                            {product.part_type && <p><strong>Tipo:</strong> {product.part_type}</p>}
                            <p><strong>Cód:</strong> {product.sku || product.code}</p>
                            {product.oem_code && <p><strong>OEM:</strong> {product.oem_code}</p>}
                            {product.parker_code && <p><strong>Parker:</strong> {product.parker_code}</p>}
                            {(product as any).supplier_code && <p><strong>Forn:</strong> {(product as any).supplier_code}</p>}

                            {/* Renderizar as Medidas Dinamicamente */}
                            {product.measurements && Object.keys(product.measurements).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {product.measurements.innerDiameter && <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[8px] font-mono">DI: {product.measurements.innerDiameter}</span>}
                                {product.measurements.outerDiameter && <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[8px] font-mono">DE: {product.measurements.outerDiameter}</span>}
                                {product.measurements.height1 && <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[8px] font-mono">A1: {product.measurements.height1}</span>}
                                {product.measurements.height2 && <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[8px] font-mono">A2: {product.measurements.height2}</span>}
                                {product.measurements.thickness && <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[8px] font-mono">ESP: {product.measurements.thickness}</span>}
                                {product.measurements.cs && <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[8px] font-mono">CS: {product.measurements.cs}</span>}
                              </div>
                            )}

                            {product.brand && <p className="font-semibold text-amber-600 mt-1">Marca: {product.brand}</p>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${freeStock > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                            }`}>
                            {freeStock > 0 ? `${freeStock} un.` : 'Sem estoque'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                        <span className="text-[9px] text-slate-400">Int: {formatMeasurement(product.measurements?.innerDiameter)}</span>
                        <span className="text-[9px] text-slate-400">Ext: {formatMeasurement(product.measurements?.outerDiameter)}</span>
                        <span className="text-[9px] text-slate-400">Alt 1: {formatMeasurement(product.measurements?.height1)}</span>
                        <span className="text-[9px] text-slate-400">Alt 2: {formatMeasurement(product.measurements?.height2)}</span>
                        <span className="text-[9px] text-slate-400">Esp: {formatMeasurement(product.measurements?.thickness)}</span>
                        <span className="text-[9px] text-slate-400">CS: {formatMeasurement(product.measurements?.cs)}</span>
                      </div>

                      {/* ADDITION CONTROLS */}
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            min="1"
                            step="any"
                            value={localQuantities[product.id] || '1'}
                            onChange={(e) => setLocalQuantities(prev => ({ ...prev, [product.id]: e.target.value }))}
                            className="w-14 text-xs border border-slate-200 rounded px-1.5 py-1 text-center font-medium focus:ring-1 focus:ring-brand focus:border-brand shadow-sm"
                            placeholder="Qtd"
                            title="Quantidade"
                          />
                          <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer select-none hover:text-slate-700 transition">
                            <input 
                              type="checkbox"
                              checked={localIgnoreStock[product.id] || false}
                              onChange={(e) => setLocalIgnoreStock(prev => ({ ...prev, [product.id]: e.target.checked }))}
                              className="rounded text-brand focus:ring-brand h-3 w-3 border-slate-300"
                            />
                            Ignorar Estoque
                          </label>
                        </div>
                         
                        <button
                          type="button"
                          onClick={() => {
                            if (handleAddStockItem) {
                              const qty = parseFloat(localQuantities[product.id] || '1');
                              if (!isNaN(qty) && qty > 0) {
                                handleAddStockItem(product, qty, localIgnoreStock[product.id] || false);
                              }
                            }
                          }}
                          className="bg-brand hover:bg-brand-dark text-white rounded px-2.5 py-1 text-[10px] font-semibold transition-colors shadow-sm flex items-center gap-1 active:scale-95"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          Adicionar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW ITEM BUTTON */}
      <div className="mt-4 flex justify-center border-t border-slate-100 pt-4">
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-2">Não encontrou o que procurava?</p>
          <button
            type="button"
            onClick={() => setIsModalCriarOpen(true)}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition shadow-sm flex items-center justify-center gap-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Criar Novo Item
          </button>
        </div>
      </div>

      <ModalCriarItem
        isOpen={isModalCriarOpen}
        onClose={() => setIsModalCriarOpen(false)}
        itemForm={itemForm}
        updateItemField={updateItemField}
        updateMeasurement={updateMeasurement}
        handleCreateNewItem={() => {
          if (handleCreateNewItem) handleCreateNewItem();
          setIsModalCriarOpen(false);
        }}
        sealFamilies={sealFamilies}
      />
    </>
  );
}
