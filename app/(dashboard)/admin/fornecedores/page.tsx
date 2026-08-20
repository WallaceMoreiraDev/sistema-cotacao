'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSuppliersAction, createSupplierAction, deleteSupplierAction, SupplierRow } from '@/app/lib/actions/suppliers';
import { toast } from 'react-hot-toast';

export default function AdminFornecedoresPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Fornecedor Original');

  const loadSuppliers = async () => {
    setIsLoading(true);
    const res = await getSuppliersAction();
    if (res.success && res.data) {
      setSuppliers(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    const res = await createSupplierAction(newName.trim(), newType);
    if (res.success) {
      toast.success('Fornecedor cadastrado!');
      setNewName('');
      setIsAdding(false);
      loadSuppliers();
    } else {
      toast.error('Erro ao cadastrar: ' + res.error);
    }
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewName('');
    setNewType('Fornecedor Original');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este fornecedor? Ele será removido de todas as listas futuras.')) return;
    const res = await deleteSupplierAction(id);
    if (res.success) {
      toast.success('Excluído com sucesso');
      loadSuppliers();
    } else {
      toast.error('Erro ao excluir: ' + res.error);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="rounded-[32px] border border-slate-200/60 bg-white/70 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-slate-200/40 relative overflow-hidden flex flex-col min-h-[500px]">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-gradient-to-br from-[#10b981]/20 to-emerald-400/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200/80 pb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-100 rounded-full">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Fornecedores</h1>
              <p className="mt-2 text-sm text-slate-500">
                Gerencie os fornecedores que aparecerão nas colunas de cotação dos protocolos.
              </p>
            </div>
          </div>
          
          {!isAdding && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar fornecedor..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800 hover:-translate-y-0.5 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 whitespace-nowrap"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Novo Fornecedor
              </button>
            </div>
          )}
        </div>

        {isAdding && (
          <div className="relative z-10 mb-8 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-teal-50/20 p-6 sm:p-7 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-950">
                Adicionar Novo Fornecedor
              </h3>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Nome da Empresa *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ex: Vedpira LTDA"
                      className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 px-4 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                    />
                  </div>
                </div>
                
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Tipo de Fornecedor *
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 px-4 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm appearance-none"
                    >
                      <option value="Fornecedor Original">Fornecedor Original (Markup 70%)</option>
                      <option value="Mercado Local">Mercado Local (Markup 30%)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 justify-end border-t border-emerald-200/40">
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
                  className="rounded-xl bg-emerald-600 px-7 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 disabled:opacity-70 transition-all hover:-translate-y-0.5"
                >
                  {isSubmitting ? 'Cadastrando...' : 'Salvar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="relative z-10 flex-1 flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-emerald-600 shadow-sm"></div>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="rounded-2xl bg-white shadow-sm p-5 mb-5 border border-slate-100">
              <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Nenhum fornecedor cadastrado</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm leading-relaxed">
              Os fornecedores cadastrados aqui aparecerão automaticamente nas colunas de cotação dos protocolos.
            </p>
          </div>
        ) : (
          <div className="relative z-10 overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Fornecedor</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Tipo</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.filter(sup => sup.name.toLowerCase().includes(searchQuery.toLowerCase()) || sup.type.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                        Nenhum fornecedor encontrado para "{searchQuery}".
                      </td>
                    </tr>
                  ) : (
                    suppliers.filter(sup => sup.name.toLowerCase().includes(searchQuery.toLowerCase()) || sup.type.toLowerCase().includes(searchQuery.toLowerCase())).map((sup) => (
                      <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-sm text-slate-900">{sup.name}</div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">ID: {sup.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                            sup.type === 'Fornecedor Original' 
                              ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10' 
                              : 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-700/10'
                          }`}>
                            {sup.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                          <button
                            onClick={() => handleDelete(sup.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
