'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProtocolsAction, updateProtocolStatusAction } from '../../lib/actions/protocols';
import { calculateTotals } from '../../lib/services/protocolService';
import type { Protocol } from '../../lib/types/database';


export default function DashboardPage() {
  const { user } = useAuth();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'geral' | 'kanban'>('geral');
  const [filterClient, setFilterClient] = useState('');
  const [filterProtocol, setFilterProtocol] = useState('');
  const [filterDateMode, setFilterDateMode] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // Calculate total sales value using the same logic as the protocol page
  const calculateTotalVenda = (protocol: Protocol): number => {
    // Prefer the pre-calculated total from the database/protocol object
    if (protocol.totals?.total && protocol.totals.total > 0) return protocol.totals.total;
    // Fallback: recalculate from items using the unified function
    if (!protocol.items || protocol.items.length === 0) return 0;
    return calculateTotals(protocol.items).total;
  };

  // Format ID to clean display without prefix
  const formatProtocolNumber = (id: string | number) => {
    if (!id) return '0000';
    if (typeof id === 'string' && id.startsWith('proto-')) return 'Novo';
    return String(id);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
    } catch {
      return dateStr;
    }
  };

  // Helper for Status Badge
  const getStatusBadge = (status: Protocol['status']) => {
    switch (status) {
      case 'draft':
        return { label: 'Rascunho', className: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'in_progress':
        return { label: 'Em andamento', className: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'separating':
        return { label: 'Em separação', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'in_review':
        return { label: 'Aguardando fornecedor', className: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'rejected':
        return { label: 'Aguardando aprovação', className: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'approved':
        return { label: 'Finalizado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: 'Em andamento', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // Filter & Sort Protocols (Most recently edited/created first)
  const filteredProtocols = useMemo(() => {
    const termClient = filterClient.trim().toLowerCase();
    const termProto = filterProtocol.trim().toLowerCase();

    const list = [...protocols].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    return list.filter((p) => {
      if (termClient && !p.clientName.toLowerCase().includes(termClient)) {
        return false;
      }
      
      if (termProto) {
        const protNum = formatProtocolNumber(p.id).toLowerCase();
        const rawId = String(p.id).toLowerCase();
        if (!protNum.includes(termProto) && !rawId.includes(termProto)) {
          return false;
        }
      }

      if (filterDateMode !== 'all') {
        const protocolDate = new Date(p.updatedAt || p.createdAt);
        if (!isNaN(protocolDate.getTime())) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (filterDateMode === 'today') {
            if (protocolDate.getTime() < today.getTime() || protocolDate.getTime() >= today.getTime() + 86400000) {
              return false;
            }
          } else if (filterDateMode === 'yesterday') {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            if (protocolDate.getTime() < yesterday.getTime() || protocolDate.getTime() >= yesterday.getTime() + 86400000) {
              return false;
            }
          } else if (filterDateMode === 'custom') {
            if (filterDateStart) {
              const start = new Date(filterDateStart);
              start.setHours(0, 0, 0, 0);
              if (protocolDate.getTime() < start.getTime() + start.getTimezoneOffset() * 60000) return false;
            }
            if (filterDateEnd) {
              const end = new Date(filterDateEnd);
              end.setHours(23, 59, 59, 999);
              if (protocolDate.getTime() > end.getTime() + end.getTimezoneOffset() * 60000) return false;
            }
          }
        }
      }

      return true;
    });
  }, [protocols, filterClient, filterProtocol, filterDateMode, filterDateStart, filterDateEnd]);

  // Group by status for Kanban (Each sorted by edit date since it derives from filteredProtocols)
  const kanbanColumns = useMemo(() => {
    const columns = [
      { key: 'draft' as const, title: 'Rascunho', tone: 'bg-slate-50 text-slate-800 border-slate-200', dot: 'bg-slate-500' },
      { key: 'in_progress' as const, title: 'Em andamento', tone: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
      { key: 'separating' as const, title: 'Em separação', tone: 'bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' },
      { key: 'rejected' as const, title: 'Aguardando aprovação', tone: 'bg-purple-50 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
      { key: 'in_review' as const, title: 'Aguardando fornecedor', tone: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
      { key: 'approved' as const, title: 'Finalizados', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
    ];

    return columns.map((col) => ({
      ...col,
      items: filteredProtocols.filter((p) => p.status === col.key),
    }));
  }, [filteredProtocols]);

  // Load protocols from Supabase on mount
  useEffect(() => {
    async function loadFromSupabase() {
      setIsLoading(true);
      const res = await getProtocolsAction();
      if (res.success && res.data && res.data.length > 0) {
        setProtocols(res.data);
      }
      setIsLoading(false);
    }
    loadFromSupabase();
  }, [setProtocols]);

  return (
    <section className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-6 sm:p-8 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#F7C00C] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-950">
                Força Máxima Vedações
              </span>
              <span className="text-xs text-slate-400">· Painel Comercial</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
              Gestão Operacional de Protocolos
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              Acompanhe cotações, consulte valores calculados e gerencie o fluxo de atendimento.
            </p>
          </div>

          <Link
            href="/protocolo/novo"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F7C00C] px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/10 transition-all hover:bg-[#E8B600] focus:ring-2 focus:ring-[#F7C00C] focus:ring-offset-2 focus:ring-offset-slate-900 shrink-0"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Novo Protocolo
          </Link>
        </div>
      </div>

      {/* Control Bar: Tabs + Search */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* View Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('geral')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'geral'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Geral (Lista)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'kanban'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2m0 10V7m6 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Kanban
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            Filtros
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Cliente</label>
            <input
              type="text"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              placeholder="Ex: Força Máxima"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Protocolo</label>
            <input
              type="text"
              value={filterProtocol}
              onChange={(e) => setFilterProtocol(e.target.value)}
              placeholder="Nº do protocolo"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Período</label>
            <select
              value={filterDateMode}
              onChange={(e) => setFilterDateMode(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white cursor-pointer"
            >
              <option value="all">Todo tempo</option>
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          {filterDateMode === 'custom' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Início</label>
                <input
                  type="date"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fim</label>
                <input
                  type="date"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content 1: ABA GERAL */}
      {activeTab === 'geral' && (
        <div className="rounded-[24px] border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-slate-200/80 bg-slate-50/80 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Lista de Protocolos
              </h2>
              <span className="text-xs text-slate-500 font-normal">
                (Ordenados por data de edição)
              </span>
            </div>
            <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-bold text-slate-700">
              {filteredProtocols.length} {filteredProtocols.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center flex flex-col items-center">
              <svg className="h-8 w-8 animate-spin text-[#F7C00C]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="mt-4 text-sm font-semibold text-slate-700">Carregando protocolos...</p>
            </div>
          ) : filteredProtocols.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-sm font-semibold text-slate-700">Nenhum protocolo encontrado</p>
              <p className="mt-1 text-xs text-slate-500">Tente ajustar o termo de pesquisa ou crie um novo protocolo.</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm border-b border-slate-200 shadow-xs">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                      Nº Protocolo
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                      Cliente
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Qtd. Itens
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                      Valor Total Venda
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      Última Edição
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredProtocols.map((protocol) => {
                    const totalVenda = calculateTotalVenda(protocol);
                    const badge = getStatusBadge(protocol.status);
                    const protNum = formatProtocolNumber(protocol.id);

                    return (
                      <tr
                        key={protocol.id}
                        className="transition hover:bg-slate-50/80 group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                            {protNum}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 text-sm block max-w-xs truncate">
                            {protocol.clientName}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full">
                            {protocol.items?.length || 0} {protocol.items?.length === 1 ? 'item' : 'itens'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="font-bold text-sm text-slate-900">
                            {formatCurrency(totalVenda)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                          {formatDate(protocol.updatedAt || protocol.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link
                            href={`/protocolo/${protocol.id}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 focus:ring-2 focus:ring-slate-900"
                          >
                            Abrir
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: ABA KANBAN (INTERATIVO) */}
      {activeTab === 'kanban' && (
        isLoading ? (
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-12 text-center flex flex-col items-center">
            <svg className="h-8 w-8 animate-spin text-[#F7C00C]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="mt-4 text-sm font-semibold text-slate-700">Carregando painel...</p>
          </div>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kanbanColumns.map((col) => (
            <div
              key={col.key}
              className="flex flex-col rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 min-h-[450px] transition-all duration-200"
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between rounded-xl border p-3 mb-3 ${col.tone} min-h-[54px]`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${col.dot}`} />
                  <h3 className="text-[10px] font-bold uppercase tracking-wider leading-tight whitespace-normal break-words">{col.title}</h3>
                </div>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold shadow-xs shrink-0 ml-1.5">
                  {col.items.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
                {col.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-6 text-center text-xs text-slate-400">
                    Nenhum protocolo neste status.
                  </div>
                ) : (
                  col.items.map((protocol) => {
                    const totalVenda = calculateTotalVenda(protocol);
                    const protNum = formatProtocolNumber(protocol.id);

                    return (
                      <div
                        key={protocol.id}
                        className="group relative block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-slate-400 hover:shadow-md cursor-default"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            {protNum}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(protocol.updatedAt || protocol.createdAt).split(' ')[0]}
                          </span>
                        </div>

                        <h4 className="mt-2.5 text-xs font-bold text-slate-900 line-clamp-2">
                          {protocol.clientName}
                        </h4>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                          <span className="text-slate-500">
                            {protocol.items?.length || 0} {protocol.items?.length === 1 ? 'item' : 'itens'}
                          </span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(totalVenda)}
                          </span>
                        </div>

                        <div className="mt-2 text-right">
                          <Link
                            href={`/protocolo/${protocol.id}`}
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-900"
                          >
                            Abrir
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
        )
      )}
    </section>
  );
}
