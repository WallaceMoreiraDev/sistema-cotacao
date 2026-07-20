'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { createProtocol, calculateTotals } from '../../../lib/services/protocolService';
import type { Protocol, ProtocolItem } from '../../../lib/types/database';

const STORAGE_KEY = 'protocols';

const initialItem: ProtocolItem = {
  id: 'item-1',
  name: 'Gaxeta de vedação',
  quantity: 1,
  unitPrice: 18.9,
  type: 'estoque',
  status: 'pendente',
  oemCode: 'GX-001',
  nickname: 'Gaxeta',
  measurements: { d1: '10', d2: '20', h: '5' },
};

export default function NewProtocolPage() {
  const router = useRouter();
  const [protocols, setProtocols] = useLocalStorage<Protocol[]>(STORAGE_KEY, []);
  const [clientName, setClientName] = useState('Cliente Demo');
  const [items] = useState<ProtocolItem[]>([initialItem]);

  const totals = useMemo(() => calculateTotals(items), [items]);

  const handleSave = () => {
    const protocol = createProtocol({
      clientName,
      items,
      totals,
      status: 'draft',
    });

    setProtocols([protocol, ...protocols]);
    router.push(`/protocolo/${protocol.id}`);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Novo protocolo</h1>
        <p className="mt-2 text-sm text-slate-600">
          Formulário principal para alimentar o fluxo inicial de protocolos e itens.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">
            Nome do cliente
            <input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-lg font-semibold text-slate-900">Itens do protocolo</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.oemCode} · {item.nickname}</p>
                  <p className="mt-2 text-sm text-slate-600">Qtd: {item.quantity}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Salvar protocolo
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Resumo</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
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
      </div>
    </section>
  );
}
