import { useState } from 'react';
import { ItemFormState, MEASUREMENT_FIELDS } from '../../../lib/config/protocolForm';
import { buildSmartDescription } from '../../../lib/utils/productNameBuilder';

interface ModalCriarItemProps {
  isOpen: boolean;
  onClose: () => void;
  itemForm: ItemFormState;
  updateItemField: (field: keyof ItemFormState, value: string | boolean) => void;
  updateMeasurement: (key: keyof ItemFormState['measurements'], value: string) => void;
  handleCreateNewItem: () => void;
  sealFamilies: any[];
}

export function ModalCriarItem({
  isOpen,
  onClose,
  itemForm,
  updateItemField,
  updateMeasurement,
  handleCreateNewItem,
  sealFamilies
}: ModalCriarItemProps) {
  if (!isOpen) return null;

  // Real-time preview of the smart description
  const previewName = buildSmartDescription({
    category: itemForm.category,
    measurements: {
      innerDiameter: itemForm.measurements.innerDiameter ? Number(itemForm.measurements.innerDiameter) : undefined,
      outerDiameter: itemForm.measurements.outerDiameter ? Number(itemForm.measurements.outerDiameter) : undefined,
      height1: itemForm.measurements.height1 ? Number(itemForm.measurements.height1) : undefined,
      height2: itemForm.measurements.height2 ? Number(itemForm.measurements.height2) : undefined,
      thickness: itemForm.measurements.thickness ? Number(itemForm.measurements.thickness) : undefined,
      cs: itemForm.measurements.cs ? Number(itemForm.measurements.cs) : undefined,
    },
    partType: itemForm.partType,
    supplierCode: itemForm.supplierCode,
    parkerOemCode: itemForm.parkerCode || itemForm.oemCode,
    brand: itemForm.brand,
  });

  const isValid = itemForm.category?.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    handleCreateNewItem();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Criar Novo Item</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Preview da Descrição Inteligente</h3>
            <p className="text-sm font-mono text-amber-950">{previewName || 'Preencha os campos abaixo...'}</p>
          </div>

          <form id="create-item-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoria <span className="text-red-500">*</span></label>
                <select
                  value={itemForm.category}
                  onChange={(e) => updateItemField('category', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  required
                >
                  <option value="">Selecione...</option>
                  {sealFamilies.map(f => (
                    <option key={f.id} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Marca</label>
                <input
                  type="text"
                  value={itemForm.brand}
                  onChange={(e) => updateItemField('brand', e.target.value)}
                  placeholder="ex: Agel, APC"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="col-span-2">
                <p className="text-xs font-bold text-slate-700 mb-2">Medidas (mm)</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {MEASUREMENT_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">{field.label}</label>
                      <input
                        type="number"
                        step="any"
                        value={itemForm.measurements[field.key]}
                        onChange={(e) => updateMeasurement(field.key, e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Material / Tipo</label>
                <input
                  type="text"
                  value={itemForm.partType}
                  onChange={(e) => updateItemField('partType', e.target.value)}
                  placeholder="ex: PU 90 SH, NBR"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantidade <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={itemForm.quantity}
                  onChange={(e) => updateItemField('quantity', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  required
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Cód. Fornecedor</label>
                <input
                  type="text"
                  value={itemForm.supplierCode}
                  onChange={(e) => updateItemField('supplierCode', e.target.value)}
                  placeholder="Código Original"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Cód. Parker/OEM</label>
                <input
                  type="text"
                  value={itemForm.parkerCode || itemForm.oemCode}
                  onChange={(e) => updateItemField('parkerCode', e.target.value)}
                  placeholder="ex: 25003500375"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Observação (Interna)</label>
                <textarea
                  value={itemForm.observation || ''}
                  onChange={(e) => updateItemField('observation', e.target.value)}
                  placeholder="Qualquer detalhe adicional (não será enviado ao Bling)"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand resize-none"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500 max-w-[60%]">
            Este item será salvo no seu rascunho. Opcionalmente, uma futura integração poderá salvar automaticamente no Bling.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="create-item-form"
              disabled={!isValid}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-brand hover:bg-brand-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar Novo Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
