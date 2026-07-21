'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { calculateTotals } from '../../../lib/services/protocolService';
import { getProtocolByIdAction } from '../../../lib/actions/protocols';
import type { Protocol } from '../../../lib/types/database';

const STORAGE_KEY = 'protocols';

export default function ProtocolDetailPage() {
  const params = useParams<{ id: string }>();
  const [protocols] = useLocalStorage<Protocol[]>(STORAGE_KEY, []);
  const [dbProtocol, setDbProtocol] = useState<Protocol | null>(null);

  useEffect(() => {
    if (params.id) {
      getProtocolByIdAction(params.id).then((res) => {
        if (res.success && res.data) {
          setDbProtocol(res.data);
        }
      });
    }
  }, [params.id]);

  const localProtocol = useMemo(() => protocols.find((item) => item.id === params.id) ?? null, [params.id, protocols]);
  const protocol = dbProtocol || localProtocol;

  const totals = useMemo(() => {
    if (!protocol) return { subtotal: 0, markup: 0, total: 0 };
    return calculateTotals(protocol.items || []);
  }, [protocol]);

  if (!protocol) {
    return <p className="text-sm text-slate-500">Protocolo não encontrado.</p>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Edição de protocolo</h1>
        <p className="mt-2 text-sm text-slate-600">
          Visualizando <span className="font-medium text-slate-900">{protocol.clientName}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Itens</h2>
        <div className="mt-4 space-y-3">
          {(protocol.items || []).map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4">
              <p className="font-medium text-slate-900">{item.name}</p>
              <p className="mt-1 text-sm text-slate-500">{item.oem} · {item.nickname}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Resumo</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>R$ {totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Markup</span>
            <span>R$ {totals.markup.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-900">
            <span>Total</span>
            <span>R$ {totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
