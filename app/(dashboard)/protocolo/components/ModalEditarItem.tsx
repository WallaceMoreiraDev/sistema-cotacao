import { useState, useEffect } from 'react';
import { ItemFormState, MEASUREMENT_FIELDS, EMPTY_ITEM_FORM } from '../../../lib/config/protocolForm';
import { buildSmartDescription } from '../../../lib/utils/productNameBuilder';
import type { ProtocolItem } from '../../../lib/types/database';

interface ModalEditarItemProps {
  isOpen: boolean;
  onClose: () => void;
  item: ProtocolItem | null;
  onSave: (itemId: string, updatedFields: Partial<ProtocolItem>) => void;
  sealFamilies: any[];
}

export function ModalEditarItem({
  isOpen,
  onClose,
  item,
  onSave,
  sealFamilies
}: ModalEditarItemProps) {
  const [form, setForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);

  // Initialize form with item data when modal opens
  useEffect(() => {
    if (isOpen && item) {
      // Fallback para itens antigos que não tinham category salvo
      let extractedCategory = item.category || '';
      if (!extractedCategory && sealFamilies) {
        const matchedFamily = sealFamilies.find(f => item.name.toUpperCase().startsWith(f.name.toUpperCase()));
        if (matchedFamily) extractedCategory = matchedFamily.name;
      }

      setForm({
        category: extractedCategory,
        brand: item.brand || '',
        quantity: String(item.quantity || '1'),
        description: item.description || '',
        observation: item.observation || '',
        ignoreStock: false,
        partType: item.part_type || '',
        supplierCode: item.code ? item.code.replace('FM-', '') : '', // reverse the FM- prefix if any
        parkerCode: item.parker_code || '',
        oemCode: item.oem_code || '',
        measurements: {
          innerDiameter: item.measurements?.innerDiameter ? String(item.measurements.innerDiameter) : '',
          outerDiameter: item.measurements?.outerDiameter ? String(item.measurements.outerDiameter) : '',
          height1: item.measurements?.height1 ? String(item.measurements.height1) : '',
          height2: item.measurements?.height2 ? String(item.measurements.height2) : '',
          thickness: item.measurements?.thickness ? String(item.measurements.thickness) : '',
          cs: item.measurements?.cs !== undefined ? String(item.measurements.cs) : '',
        },
      });
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const updateField = (field: keyof ItemFormState, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateMeasurement = (key: keyof ItemFormState['measurements'], value: string) => {
    setForm(prev => ({
      ...prev,
      measurements: { ...prev.measurements, [key]: value }
    }));
  };

  const previewName = buildSmartDescription({
    category: form.category,
    measurements: {
      innerDiameter: form.measurements.innerDiameter ? Number(form.measurements.innerDiameter) : undefined,
      outerDiameter: form.measurements.outerDiameter ? Number(form.measurements.outerDiameter) : undefined,
      height1: form.measurements.height1 ? Number(form.measurements.height1) : undefined,
      height2: form.measurements.height2 ? Number(form.measurements.height2) : undefined,
      thickness: form.measurements.thickness ? Number(form.measurements.thickness) : undefined,
      cs: form.measurements.cs ? Number(form.measurements.cs) : undefined,
    },
    partType: form.partType,
    supplierCode: form.supplierCode,
    parkerOemCode: form.parkerCode || form.oemCode,
    brand: form.brand,
  });

  const isValid = form.category?.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const updatedFields: Partial<ProtocolItem> = {
      name: previewName || form.category,
      category: form.category,
      brand: form.brand,
      quantity: Number(form.quantity),
      observation: form.observation,
      part_type: form.partType,
      code: form.supplierCode ? `FM-${form.supplierCode.toUpperCase()}` : undefined,
      parker_code: form.parkerCode,
      oem_code: form.oemCode,
      description: form.description,
      measurements: {
        ...item.measurements, // preserve excludeFromPurchasing etc
        innerDiameter: form.measurements.innerDiameter ? Number(form.measurements.innerDiameter) : undefined,
        outerDiameter: form.measurements.outerDiameter ? Number(form.measurements.outerDiameter) : undefined,
        height1: form.measurements.height1 ? Number(form.measurements.height1) : undefined,
        height2: form.measurements.height2 ? Number(form.measurements.height2) : undefined,
        thickness: form.measurements.thickness ? Number(form.measurements.thickness) : undefined,
        cs: form.measurements.cs ? Number(form.measurements.cs) : undefined,
      }
    };

    onSave(item.id, updatedFields);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Editar Item</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Preview da Descrição Inteligente</h3>
            <p className="text-sm font-mono text-amber-950">{previewName || 'Preencha os campos abaixo...'}</p>
          </div>

          <form id="edit-item-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoria <span className="text-red-500">*</span></label>
                <select
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
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
                  value={form.brand}
                  onChange={(e) => updateField('brand', e.target.value)}
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
                        value={form.measurements[field.key]}
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
                  value={form.partType}
                  onChange={(e) => updateField('partType', e.target.value)}
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
                  value={form.quantity}
                  onChange={(e) => updateField('quantity', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  required
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Cód. Fornecedor</label>
                <input
                  type="text"
                  value={form.supplierCode}
                  onChange={(e) => updateField('supplierCode', e.target.value)}
                  placeholder="Código Original"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Cód. Parker/OEM</label>
                <input
                  type="text"
                  value={form.parkerCode || form.oemCode}
                  onChange={(e) => updateField('parkerCode', e.target.value)}
                  placeholder="ex: 25003500375"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Observação (Interna)</label>
                <textarea
                  value={form.observation || ''}
                  onChange={(e) => updateField('observation', e.target.value)}
                  placeholder="Qualquer detalhe adicional (não será enviado ao Bling)"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand resize-none"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-item-form"
            disabled={!isValid}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-lg hover:bg-brand-dark transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
