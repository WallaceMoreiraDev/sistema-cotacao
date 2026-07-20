'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import type { Protocol } from '../../lib/types/database';

const STORAGE_KEY = 'protocols';

export default function DashboardPage() {
  const { user } = useAuth();
  const [protocols] = useLocalStorage<Protocol[]>(STORAGE_KEY, []);

  const sortedProtocols = useMemo(() => {
    return [...protocols].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [protocols]);

  const metrics = [
    { label: 'Protocolos ativos', value: sortedProtocols.length.toString(), hint: 'Em andamento' },
    { label: 'Itens cadastrados', value: sortedProtocols.reduce((sum, protocol) => sum + protocol.items.length, 0).toString(), hint: 'Total geral' },
    { label: 'Status prioritário', value: user?.role === 'admin' ? 'Aprovação' : 'Cotação', hint: 'Fluxo atual' },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-7 text-white shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
              Painel comercial
            </p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Controle operacional e visão rápida dos protocolos.
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
              {user?.name ?? 'Usuário'} · {user?.role === 'admin' ? 'Administrador' : 'Funcionário'} · acompanhe o trabalho, priorize demandas e acesse os protocolos com mais agilidade.
            </p>
          </div>

          <Link
            href="/protocolo/novo"
            className="inline-flex items-center justify-center rounded-2xl bg-[#F7C00C] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#e8b600]"
          >
            + Novo protocolo
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</p>
            <p className="mt-1 text-sm text-slate-500">{metric.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Protocolos recentes</h2>
              <p className="mt-1 text-sm text-slate-500">Últimos registros atualizados da operação.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              {sortedProtocols.length} protocolos
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {sortedProtocols.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                Nenhum protocolo salvo ainda. Comece criando o primeiro registro para visualizar o fluxo.
              </div>
            ) : (
              sortedProtocols.map((protocol) => (
                <Link
                  key={protocol.id}
                  href={`/protocolo/${protocol.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-400 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{protocol.clientName}</p>
                    <p className="mt-1 text-sm text-slate-500">{protocol.status}</p>
                  </div>
                  <div className="text-sm text-slate-500 sm:text-right">
                    <p>{new Date(protocol.updatedAt).toLocaleDateString('pt-BR')}</p>
                    <p className="mt-1">{protocol.items.length} itens</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Fila de trabalho</h2>
          <p className="mt-1 text-sm text-slate-500">Organização visual do fluxo de operação.</p>

          <div className="mt-5 grid gap-3">
            {[
              { title: 'Em andamento', tone: 'bg-slate-100 text-slate-700' },
              { title: 'Aguardando fornecedor', tone: 'bg-amber-50 text-amber-800' },
              { title: 'Aguardando aprovação', tone: 'bg-rose-50 text-rose-700' },
              { title: 'Finalizados', tone: 'bg-emerald-50 text-emerald-700' },
            ].map((column) => (
              <div key={column.title} className={`rounded-2xl border border-slate-200 p-3 text-sm font-medium ${column.tone}`}>
                {column.title}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
