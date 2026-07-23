'use client';

import { useState, useEffect } from 'react';
import { 
  getSealTypesAction, 
  createSealTypeAction, 
  updateSealTypeAction, 
  deleteSealTypeAction,
  getSealFamiliesAction 
} from '../../../lib/actions/admin';
import type { SealType, SealFamily } from '../../../lib/types/database';
import toast from 'react-hot-toast';

const AVAILABLE_MEASUREMENTS = [
  { id: 'innerDiameter', label: 'Diâmetro Interno (d)' },
  { id: 'outerDiameter', label: 'Diâmetro Externo (D)' },
  { id: 'height1', label: 'Altura 1 (h)' },
  { id: 'height2', label: 'Altura 2 (H)' },
  { id: 'thickness', label: 'Espessura (e)' },
  { id: 'cs', label: 'Secção Transversal (CS)' },
];

export default function SealTypesPage() {
  const [sealTypes, setSealTypes] = useState<SealType[]>([]);
  const [families, setFamilies] = useState<SealFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    family_id: '',
    requiredMeasurements: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [typesRes, familiesRes] = await Promise.all([
      getSealTypesAction(),
      getSealFamiliesAction()
    ]);
    
    if (typesRes.success && typesRes.data) {
      setSealTypes(typesRes.data);
    }
    
    if (familiesRes.success && familiesRes.data) {
      setFamilies(familiesRes.data);
    }
    setIsLoading(false);
  }

  const handleToggleMeasurement = (measureId: string) => {
    setFormData((prev) => {
      const isSelected = prev.requiredMeasurements.includes(measureId);
      if (isSelected) {
        return { ...prev, requiredMeasurements: prev.requiredMeasurements.filter(m => m !== measureId) };
      } else {
        return { ...prev, requiredMeasurements: [...prev.requiredMeasurements, measureId] };
      }
    });
  };

  const handleEdit = (sealType: SealType) => {
    setFormData({
      name: sealType.name,
      family_id: sealType.family_id ? String(sealType.family_id) : '',
      requiredMeasurements: sealType.requiredMeasurements || []
    });
    setEditingId(sealType.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', family_id: '', requiredMeasurements: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    
    const payload = {
      name: formData.name.trim(),
      family_id: formData.family_id ? Number(formData.family_id) : 0,
      requiredMeasurements: formData.requiredMeasurements
    };
    
    if (editingId) {
      const res = await updateSealTypeAction(editingId, payload);

      if (res.success && res.data) {
        toast.success('Tipo atualizado com sucesso!');
        setSealTypes(sealTypes.map(st => st.id === editingId ? res.data! : st));
        handleCancel();
      } else {
        toast.error('Erro ao atualizar: ' + res.error);
      }
    } else {
      const res = await createSealTypeAction(payload);

      if (res.success && res.data) {
        toast.success('Tipo criado com sucesso!');
        setSealTypes([...sealTypes, res.data].sort((a, b) => a.name.localeCompare(b.name)));
        handleCancel();
      } else {
        toast.error('Erro ao criar: ' + res.error);
      }
    }
    
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Tem certeza que deseja excluir este tipo de vedação? Pode quebrar dependências de protocolos existentes.')) return;
    
    const res = await deleteSealTypeAction(id);
    if (res.success) {
      toast.success('Tipo excluído!');
      setSealTypes(sealTypes.filter((s) => s.id !== id));
    } else {
      toast.error('Erro ao excluir: ' + res.error);
    }
  };

  const formatMeasurementsLabel = (arr?: string[]) => {
    if (!arr || arr.length === 0) return <span className="text-slate-400 font-normal italic">Nenhuma medida exigida</span>;
    
    return (
      <div className="flex flex-wrap gap-1.5">
        {arr.map(m => {
          const found = AVAILABLE_MEASUREMENTS.find(am => am.id === m);
          return (
            <span key={m} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {found ? found.label : m}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="rounded-[32px] border border-slate-200/60 bg-white/70 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-slate-200/40 relative overflow-hidden flex flex-col min-h-[500px]">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-gradient-to-br from-[#F7C00C]/20 to-amber-400/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200/80 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Tipos de Vedações</h1>
            <p className="mt-2 text-sm text-slate-500">
              Defina as vedações específicas, vinculando-as a uma família e exigindo medidas dinâmicas na cotação.
            </p>
          </div>
          
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800 hover:-translate-y-0.5 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Novo Tipo
            </button>
          )}
        </div>

        {isAdding && (
          <div className="relative z-10 mb-8 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-orange-50/20 p-6 sm:p-7 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-950">
                {editingId ? 'Editar Tipo de Vedação' : 'Adicionar Novo Tipo de Vedação'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Tipo Específico de Vedação *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Anel Guia Bronze, Gaxeta PU..."
                      className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 px-4 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal focus:border-[#F7C00C] focus:bg-white focus:ring-4 focus:ring-[#F7C00C]/10 shadow-sm"
                    />
                  </div>
                </div>
                
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Família Principal *
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={formData.family_id}
                      onChange={(e) => setFormData({ ...formData, family_id: e.target.value })}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 px-4 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#F7C00C] focus:bg-white focus:ring-4 focus:ring-[#F7C00C]/10 shadow-sm appearance-none"
                    >
                      <option value="">Selecione uma família...</option>
                      {families.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    {/* Select arrow icon */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Medidas Exigidas na Cotação
                </label>
                <p className="mb-4 text-xs text-slate-500">
                  Selecione quais dimensões devem ser preenchidas obrigatoriamente quando esta vedação for selecionada no protocolo.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AVAILABLE_MEASUREMENTS.map((measure) => {
                    const isChecked = formData.requiredMeasurements.includes(measure.id);
                    return (
                      <label 
                        key={measure.id} 
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                          isChecked 
                            ? 'border-[#F7C00C] bg-amber-50/60 text-slate-900 font-bold ring-2 ring-[#F7C00C]/30 shadow-sm' 
                            : 'border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300 text-slate-600 font-medium'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMeasurement(measure.id)}
                          className="h-4 w-4 rounded border-slate-300 text-[#F7C00C] focus:ring-[#F7C00C] accent-[#F7C00C]"
                        />
                        <span className="text-xs tracking-wide">{measure.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 justify-end border-t border-amber-200/40">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#F7C00C] px-7 py-3 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 hover:bg-[#E8B600] disabled:opacity-70 transition-all hover:-translate-y-0.5"
                >
                  {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar Tipo' : 'Salvar Tipo'}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="relative z-10 flex-1 flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#F7C00C] shadow-sm"></div>
          </div>
        ) : sealTypes.length === 0 ? (
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="rounded-2xl bg-white shadow-sm p-5 mb-5 border border-slate-100">
              <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Nenhum tipo cadastrado</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm leading-relaxed">
              Crie os tipos de vedações específicas (ex: Anel Guia Bronze) e defina quais medidas precisam ser preenchidas.
            </p>
          </div>
        ) : (
          <div className="relative z-10 overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de Vedação (Específico)</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Medidas Exigidas</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sealTypes.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-sm text-slate-900">{st.name}</div>
                        {st.family?.name && (
                          <div className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded w-fit tracking-wider mt-1">
                            {st.family.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {formatMeasurementsLabel(st.requiredMeasurements)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleEdit(st)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(st.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
