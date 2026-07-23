'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSuppliersAction, createSupplierAction, deleteSupplierAction, SupplierRow } from '@/app/lib/actions/suppliers';
import { toast } from 'react-hot-toast';

export default function AdminFornecedoresPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Fornecedor Original');

  const loadSuppliers = async () => {
    setLoading(true);
    const res = await getSuppliersAction();
    if (res.success && res.data) {
      setSuppliers(res.data);
    }
    setLoading(false);
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
      loadSuppliers();
    } else {
      toast.error('Erro ao cadastrar: ' + res.error);
    }
    setIsSubmitting(false);
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-slate-400 hover:text-slate-600 transition">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Fornecedores</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="md:col-span-1">
          <form onSubmit={handleCreate} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Novo Fornecedor</h2>
            
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nome da Empresa</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Vedpira LTDA"
                className="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-emerald-600 sm:text-sm sm:leading-6"
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tipo de Fornecedor</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-emerald-600 sm:text-sm sm:leading-6"
              >
                <option value="Fornecedor Original">Fornecedor Original (Markup 70%)</option>
                <option value="Mercado Local">Mercado Local (Markup 30%)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar Fornecedor'}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-sm font-bold text-slate-700">Fornecedores Cadastrados</h2>
              <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{suppliers.length} ativos</span>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm animate-pulse">Carregando...</div>
            ) : suppliers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Nenhum fornecedor cadastrado.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {suppliers.map(sup => (
                  <li key={sup.id} className="p-4 hover:bg-slate-50 flex items-center justify-between transition-colors">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{sup.name}</h3>
                      <span className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">{sup.type}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(sup.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      title="Excluir"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
