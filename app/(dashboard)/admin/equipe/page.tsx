'use client';

import { useState, useEffect } from 'react';
import { getUsersAction, createUserAction, updateUserProfileAction, adminResetUserPasswordAction } from '@/app/lib/actions/users';
import { Profile } from '@/app/lib/types/database';

export default function EquipePage() {
  const [users, setUsers] = useState<(Profile & { email: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newUserData, setNewUserData] = useState({
    email: '',
    passwordInicial: '',
    fullName: '',
    role: 'funcionario' as 'admin' | 'funcionario',
    jobTitle: '',
    department: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setIsLoading(true);
    const res = await getUsersAction();
    if (res.success && res.data) {
      setUsers(res.data);
    } else {
      setError(res.error || 'Erro ao carregar usuários.');
    }
    setIsLoading(false);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const normalizedData = {
      ...newUserData,
      email: newUserData.email.trim().toLowerCase(),
      passwordInicial: newUserData.passwordInicial.trim(),
    };

    const res = await createUserAction(normalizedData);
    if (res.success) {
      setIsCreateModalOpen(false);
      setNewUserData({ email: '', passwordInicial: '', fullName: '', role: 'funcionario', jobTitle: '', department: '' });
      await loadUsers();
    } else {
      setError(res.error || 'Erro ao criar usuário');
    }
    setIsSubmitting(false);
  }

  async function handleToggleStatus(user: Profile & { email: string }) {
    const newStatus = user.status === 'ativo' ? 'inativo' : 'ativo';
    const res = await updateUserProfileAction(user.id, { status: newStatus });
    if (res.success) {
      setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    }
  }

  async function handleResetPassword(user: Profile & { email: string }) {
    const promptPass = prompt(`Digite a nova senha temporária para ${user.full_name}:`);
    if (!promptPass) return;
    
    const newPass = promptPass.trim();
    if (newPass.length < 6) {
      alert("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }
    
    const confirm = window.confirm(`Deseja realmente alterar a senha de ${user.full_name} para "${newPass}" e forçar a troca no próximo login?`);
    if (!confirm) return;

    const res = await adminResetUserPasswordAction(user.id, newPass);
    if (res.success) {
      alert("Senha alterada com sucesso! O usuário deverá trocar a senha no próximo acesso.");
      await loadUsers(); // reload to update needs_password_change if we showed it
    } else {
      alert("Erro ao alterar senha: " + res.error);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Equipe e Acessos</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os funcionários, cargos e permissões do sistema.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 focus:ring-4 focus:ring-slate-900/10 active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Funcionário
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-[32px] border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Cargo / Setor</th>
                <th className="px-6 py-4">Nível de Acesso</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Carregando usuários...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhum usuário cadastrado.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{u.full_name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{u.job_title}</div>
                      <div className="text-xs text-slate-500">{u.department}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                        u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${
                        u.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'ativo' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleResetPassword(u)}
                          className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                        >
                          Resetar Senha
                        </button>
                        <span className="text-slate-300">|</span>
                        <button 
                          onClick={() => handleToggleStatus(u)}
                          className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          {u.status === 'ativo' ? 'Desativar' : 'Reativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Novo Funcionário</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-600 text-sm font-medium border border-rose-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nome Completo</label>
                    <input
                      required
                      type="text"
                      value={newUserData.fullName}
                      onChange={(e) => setNewUserData({...newUserData, fullName: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10"
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">E-mail</label>
                    <input
                      required
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10"
                      placeholder="joao@empresa.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Senha Inicial</label>
                    <input
                      required
                      type="text"
                      value={newUserData.passwordInicial}
                      onChange={(e) => setNewUserData({...newUserData, passwordInicial: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10"
                      placeholder="Senha123!"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Setor</label>
                    <input
                      required
                      type="text"
                      value={newUserData.department}
                      onChange={(e) => setNewUserData({...newUserData, department: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10"
                      placeholder="Ex: Comercial"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cargo</label>
                    <input
                      required
                      type="text"
                      value={newUserData.jobTitle}
                      onChange={(e) => setNewUserData({...newUserData, jobTitle: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10"
                      placeholder="Ex: Assistente"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nível de Acesso (Sistema)</label>
                    <select
                      value={newUserData.role}
                      onChange={(e) => setNewUserData({...newUserData, role: e.target.value as 'admin' | 'funcionario'})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10"
                    >
                      <option value="funcionario">Funcionário (Dashboard e Protocolos)</option>
                      <option value="admin">Administrador (Acesso Total)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Criando...' : 'Criar Funcionário'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
