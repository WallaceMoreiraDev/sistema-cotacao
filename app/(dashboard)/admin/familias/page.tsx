'use client';

import { useState, useEffect } from 'react';
import { getSealFamiliesAction, createSealFamilyAction, updateSealFamilyAction, deleteSealFamilyAction } from '../../../lib/actions/admin';
import type { SealFamily } from '../../../lib/types/database';
import toast from 'react-hot-toast';

export default function FamiliesPage() {
  const [families, setFamilies] = useState<SealFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadFamilies();
  }, []);

  async function loadFamilies() {
    setIsLoading(true);
    const res = await getSealFamiliesAction();
    if (res.success && res.data) {
      setFamilies(res.data);
    }
    setIsLoading(false);
  }

  const handleEdit = (family: SealFamily) => {
    setName(family.name);
    setEditingId(family.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    
    if (editingId) {
      const res = await updateSealFamilyAction(editingId, name.trim());

      if (res.success && res.data) {
        toast.success('Família atualizada com sucesso!');
        setFamilies(families.map(f => f.id === editingId ? res.data! : f));
        handleCancel();
      } else {
        toast.error('Erro ao atualizar: ' + res.error);
      }
    } else {
      const res = await createSealFamilyAction(name.trim());

      if (res.success && res.data) {
        toast.success('Família criada com sucesso!');
        setFamilies([...families, res.data].sort((a, b) => a.name.localeCompare(b.name)));
        handleCancel();
      } else {
        toast.error('Erro ao criar: ' + res.error);
      }
    }
    
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Tem certeza que deseja excluir esta família? Isso deixará os tipos de vedações vinculados a ela sem família.')) return;
    
    const res = await deleteSealFamilyAction(id);
    if (res.success) {
      toast.success('Família excluída!');
      setFamilies(families.filter((s) => s.id !== id));
    } else {
      toast.error('Erro ao excluir: ' + res.error);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="rounded-[32px] border border-slate-200/60 bg-white/70 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-slate-200/40 relative overflow-hidden flex flex-col min-h-[500px]">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-gradient-to-br from-[#F7C00C]/20 to-amber-400/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200/80 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Famílias de Vedações</h1>
            <p className="mt-2 text-sm text-slate-500">
              Gerencie os grupos macro de vedações (ex: Anel Guia, Gaxeta, Raspador).
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
              Nova Família
            </button>
          )}
        </div>

        {isAdding && (
          <div className="relative z-10 mb-8 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-orange-50/20 p-6 sm:p-7 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-950">
                {editingId ? 'Editar Família' : 'Adicionar Nova Família'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-5 items-end">
              <div className="flex-1 w-full group">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Nome da Família *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Gaxeta, Anel Guia, Raspador..."
                    className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 px-4 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal focus:border-[#F7C00C] focus:bg-white focus:ring-4 focus:ring-[#F7C00C]/10 shadow-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all border border-slate-200 w-full sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#F7C00C] px-7 py-3.5 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 hover:bg-[#E8B600] disabled:opacity-70 transition-all hover:-translate-y-0.5 w-full sm:w-auto"
                >
                  {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="relative z-10 flex-1 flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#F7C00C] shadow-sm"></div>
          </div>
        ) : families.length === 0 ? (
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="rounded-2xl bg-white shadow-sm p-5 mb-5 border border-slate-100">
              <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Nenhuma família cadastrada</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm leading-relaxed">
              Crie as macro famílias para organizar seus Tipos de Vedações (ex: Gaxeta, Anel Guia).
            </p>
          </div>
        ) : (
          <div className="relative z-10 overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">ID</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Nome da Família</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {families.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono font-medium">
                        #{f.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-sm text-slate-900">{f.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleEdit(f)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(f.id)}
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
