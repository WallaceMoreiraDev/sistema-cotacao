'use client';

import { useState, useEffect } from 'react';
import { getSystemSettingsAction, updateSystemSettingsAction } from '../../../lib/actions/admin';
import {
  syncBlingCategoriesAction,
  syncBlingProductsAction,
  syncBlingStockAction,
} from '../../../lib/actions/sync';
import type { SystemSettings } from '../../../lib/types/database';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({ markup_original: 70, markup_local: 30 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      const res = await getSystemSettingsAction();
      if (res.success && res.data) {
        setSettings(res.data);
      }
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const res = await updateSystemSettingsAction(settings);
    
    if (res.success) {
      toast.success('Configurações globais salvas com sucesso!');
    } else {
      toast.error('Erro ao salvar as configurações: ' + res.error);
    }
    
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="rounded-[32px] border border-slate-200/60 bg-white/70 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-slate-200/40 relative overflow-hidden">
        {/* Background Decorative Gradient */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-gradient-to-br from-[#F7C00C]/20 to-amber-400/5 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Configurações Globais
          </h1>
          <p className="mt-3 text-base text-slate-500 leading-relaxed max-w-2xl">
            Ajuste os parâmetros de negócio que definem as margens de lucro padrão da operação. Alterações nessas margens ditarão os critérios de aprovação automática dos protocolos.
          </p>

          {isLoading ? (
            <div className="mt-12 flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#F7C00C] shadow-sm"></div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-10 space-y-8">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Fornecedor Original Card */}
                <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-[#F7C00C]/50 hover:shadow-md">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white to-slate-50 opacity-50 z-0"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-inner">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Fornecedor Original</h2>
                    </div>
                    
                    <p className="mb-5 text-sm text-slate-500 min-h-[60px]">
                      Lucro aplicado por padrão ao cotar com fabricantes e distribuidores homologados.
                    </p>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Markup Padrão</label>
                      <div className="relative w-full">
                        <input
                          type="number"
                          value={settings.markup_original}
                          onChange={(e) => setSettings({ ...settings, markup_original: Number(e.target.value) })}
                          className="block w-full rounded-xl border-slate-200 bg-slate-50/50 py-3 pl-4 pr-12 text-lg font-bold text-slate-800 outline-none transition-all focus:border-[#F7C00C] focus:bg-white focus:ring-4 focus:ring-[#F7C00C]/10"
                          required
                          min="0"
                          step="0.1"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                          <span className="text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mercado Local Card */}
                <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-[#F7C00C]/50 hover:shadow-md">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white to-slate-50 opacity-50 z-0"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 shadow-inner">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Mercado Local</h2>
                    </div>
                    
                    <p className="mb-5 text-sm text-slate-500 min-h-[60px]">
                      Lucro aplicado por padrão em compras de emergência e parceiros locais.
                    </p>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Markup Padrão</label>
                      <div className="relative w-full">
                        <input
                          type="number"
                          value={settings.markup_local}
                          onChange={(e) => setSettings({ ...settings, markup_local: Number(e.target.value) })}
                          className="block w-full rounded-xl border-slate-200 bg-slate-50/50 py-3 pl-4 pr-12 text-lg font-bold text-slate-800 outline-none transition-all focus:border-[#F7C00C] focus:bg-white focus:ring-4 focus:ring-[#F7C00C]/10"
                          required
                          min="0"
                          step="0.1"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                          <span className="text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bling Integration Section */}
              <div className="mt-8 border-t border-slate-200/80 pt-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-800">Integração Bling ERP</h2>
                  <p className="text-sm text-slate-500 mt-1">Configure as credenciais OAuth v3 para sincronização de produtos e estoque.</p>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Client ID</label>
                    <input
                      type="text"
                      value={settings.bling_client_id || ''}
                      onChange={(e) => setSettings({ ...settings, bling_client_id: e.target.value })}
                      className="block w-full rounded-xl border-slate-200 bg-slate-50/50 py-3 px-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-[#F7C00C] focus:bg-white focus:ring-4 focus:ring-[#F7C00C]/10"
                      placeholder="Cole o Client ID aqui"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Client Secret</label>
                    <input
                      type="password"
                      value={settings.bling_client_secret || ''}
                      onChange={(e) => setSettings({ ...settings, bling_client_secret: e.target.value })}
                      className="block w-full rounded-xl border-slate-200 bg-slate-50/50 py-3 px-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-[#F7C00C] focus:bg-white focus:ring-4 focus:ring-[#F7C00C]/10"
                      placeholder="Cole o Client Secret aqui"
                    />
                  </div>
                </div>

                {settings.bling_client_id && (
                  <div className="mt-6 flex flex-col gap-4 rounded-xl bg-blue-50/50 border border-blue-100 p-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <p className="text-sm text-blue-800">
                        <strong>Status:</strong> {settings.bling_access_token ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Autenticado e Conectado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                            Aguardando Autorização (OAuth)
                          </span>
                        )}
                        
                        {settings.bling_access_token && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('Deseja realmente desconectar e limpar os tokens do Bling?')) return;
                              
                              const clearedSettings = {
                                ...settings,
                                bling_access_token: '',
                                bling_refresh_token: '',
                                bling_token_expires_at: ''
                              };
                              
                              toast.loading('Desconectando...', { id: 'disconnect' });
                              const res = await updateSystemSettingsAction(clearedSettings);
                              
                              if (res.success) {
                                toast.success('Desconectado com sucesso!', { id: 'disconnect' });
                                window.location.reload();
                              } else {
                                toast.error('Erro ao desconectar', { id: 'disconnect' });
                              }
                            }}
                            className="ml-3 text-xs font-medium text-slate-500 hover:text-red-600 underline underline-offset-2 transition-colors"
                          >
                            Desconectar / Limpar Tokens
                          </button>
                        )}
                      </p>

                      {settings.bling_access_token && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              toast.loading('Sincronizando Categorias...', { id: 'syncCat' });
                              const res = await syncBlingCategoriesAction();
                              if (res.success) toast.success(res.message || 'Sucesso', { id: 'syncCat' });
                              else toast.error(res.error ? String(res.error) : 'Erro ao sincronizar', { id: 'syncCat' });
                            }}
                            className="rounded-lg bg-white border border-blue-200 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
                          >
                            Puxar Categorias
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              toast.loading('Sincronizando Produtos...', { id: 'syncProd' });
                              const res = await syncBlingProductsAction();
                              if (res.success) toast.success(res.message || 'Sucesso', { id: 'syncProd' });
                              else toast.error(res.error ? String(res.error) : 'Erro ao sincronizar', { id: 'syncProd' });
                            }}
                            className="rounded-lg bg-blue-600 border border-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            Puxar Produtos
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              toast.loading('Sincronizando Estoques...', { id: 'syncStock' });
                              const res = await syncBlingStockAction();
                              if (res.success) toast.success(res.message || 'Sucesso', { id: 'syncStock' });
                              else toast.error(res.error ? String(res.error) : 'Erro ao sincronizar', { id: 'syncStock' });
                            }}
                            className="rounded-lg bg-emerald-600 border border-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            Sincronizar Estoque Físico
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {!settings.bling_access_token && (
                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-blue-800 uppercase tracking-widest mb-2">Código de Autorização (Code)</label>
                          <input
                            type="text"
                            id="bling_code_input"
                            className="block w-full rounded-xl border-blue-200 bg-white py-2 px-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            placeholder="Cole o código (code) recebido na URL do Bling"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const code = (document.getElementById('bling_code_input') as HTMLInputElement).value;
                            if (!code) return toast.error('Cole o código de autorização primeiro.');
                            
                            try {
                              const res = await fetch('/api/bling/oauth', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ code })
                              });
                              
                              const data = await res.json();
                              if (data.success) {
                                toast.success('Bling conectado com sucesso!');
                                window.location.reload();
                              } else {
                                toast.error(data.error || 'Erro ao conectar');
                              }
                            } catch (err) {
                              toast.error('Falha de rede.');
                            }
                          }}
                          className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                        >
                          Autorizar Código
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-medium">Qualquer venda fora desses padrões cairá em aprovação.</span>
                </div>
                
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-bold tracking-wide text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800 hover:-translate-y-0.5 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                      Salvando...
                    </>
                  ) : (
                    'Salvar Configurações'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
