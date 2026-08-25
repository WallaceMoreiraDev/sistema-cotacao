'use client';

import { useState, useMemo } from 'react';
import type { Protocol, ProtocolItem } from '../../lib/types/database';
import { formatCurrency, formatMeasurement } from '../../lib/utils/protocolFormatters';
import { saveProtocolAction } from '../../lib/actions/crud';

interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  protocols: {
    protocolId: string | number;
    protocolTitle: string;
    clientName: string;
    items: ProtocolItem[];
  }[];
}

interface Props {
  initialProtocols: any[]; // using any since database returns raw rows
  suppliers: { id: string | number; name: string }[];
  userRole?: string;
}

export default function PainelComprasClient({ initialProtocols, suppliers, userRole }: Props) {
  const [protocols, setProtocols] = useState<any[]>(initialProtocols);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Parse raw protocols and group them
  const groupedData = useMemo(() => {
    const groups: Record<string, SupplierGroup> = {};

    protocols.forEach(proto => {
      if (!proto.items || !Array.isArray(proto.items)) return;

      const items: ProtocolItem[] = proto.items;
      
      // Filter items to buy
      const pendingItems = items.filter(
        i => i.type === 'a_cotar' && i.isPurchased !== true
      );

      if (pendingItems.length === 0) return;

      // Group by supplier
      const supplierMap: Record<string, ProtocolItem[]> = {};
      pendingItems.forEach(i => {
        let sId = String(i.forcedSupplierId || i.supplierId || '');
        
        // If still no supplierId but we have costs, determine the cheapest
        if (!sId || sId === 'undefined') {
          if (i.supplierCosts) {
            const validEntries = Object.entries(i.supplierCosts).filter(([_, v]) => v > 0);
            if (validEntries.length > 0) {
              const cheapest = validEntries.reduce((min, current) => current[1] < min[1] ? current : min);
              sId = cheapest[0];
            }
          }
        }

        // Only group if we have a resolved supplier ID
        if (sId && sId !== 'undefined' && sId !== 'null') {
          if (!supplierMap[sId]) supplierMap[sId] = [];
          supplierMap[sId].push(i);
        }
      });

      // Add to global groups
      Object.entries(supplierMap).forEach(([sId, sItems]) => {
        if (!groups[sId]) {
          const sup = suppliers.find(s => String(s.id) === sId);
          groups[sId] = {
            supplierId: sId,
            supplierName: sup ? sup.name : 'Fornecedor Desconhecido',
            protocols: []
          };
        }
        
        groups[sId].protocols.push({
          protocolId: proto.id,
          protocolTitle: proto.title || `Protocolo #${proto.id}`,
          clientName: proto.client_name || proto.clientName,
          items: sItems
        });
      });
    });

    return Object.values(groups).sort((a, b) => a.supplierName.localeCompare(b.supplierName));
  }, [protocols, suppliers]);

  // Handle toggling purchase status
  const handleTogglePurchase = async (protocolId: string | number, itemId: string) => {
    setSavingId(itemId);
    
    // Find the protocol
    const protoIndex = protocols.findIndex(p => p.id === protocolId);
    if (protoIndex === -1) {
      setSavingId(null);
      return;
    }
    
    const proto = protocols[protoIndex];
    const newItems = (proto.items as ProtocolItem[]).map(i => {
      if (i.id === itemId) {
        return { ...i, isPurchased: true };
      }
      return i;
    });

    // Optimistic update
    const newProtocols = [...protocols];
    newProtocols[protoIndex] = { ...proto, items: newItems };
    setProtocols(newProtocols);

    // Save to DB
    const res = await saveProtocolAction({ ...proto, items: newItems });
    if (!res.success) {
      alert('Erro ao salvar no banco. A página será recarregada.');
      window.location.reload();
    }
    
    setSavingId(null);
  };

  if (groupedData.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 bg-slate-50/50">
        <h1 className="text-2xl font-black text-slate-800 mb-2">Panorama de Compras</h1>
        <p className="text-slate-500">Nenhum item pendente de compra encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Panorama Global de Compras</h1>
        <p className="text-slate-500 mt-1">
          Lista consolidada de todos os itens &quot;A Cotar&quot; agrupados por fornecedor. Otimize seus pedidos e fretes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {groupedData.map(group => (
          <div key={group.supplierId} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{group.supplierName}</h2>
                  <p className="text-xs font-medium text-slate-500">{group.protocols.length} protocolo(s) pendente(s)</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {group.protocols.map(p => (
                <div key={p.protocolId} className="p-4 md:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      #{p.protocolId}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">
                      {p.clientName}
                      <span className="text-slate-400 font-normal ml-2">{p.protocolTitle}</span>
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {p.items.map((item, idx) => {
                      const measurements = Object.values(item.measurements || {}).filter(Boolean).join('x');
                      return (
                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                            <div>
                              <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                {item.code || item.oem || 'Sem ref.'}
                                {item.forcedSupplierId && (
                                  <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">
                                    FORNECEDOR FORÇADO
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">{item.name || 'Sem nome'}</div>
                              {measurements && (
                                <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                  {measurements}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between md:justify-end gap-6">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantidade</span>
                              <span className="text-lg font-black text-brand">{item.quantity}</span>
                            </div>
                            <div className="h-8 w-px bg-slate-200 hidden md:block" />
                            <div className="flex flex-col items-end min-w-[120px]">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custo Unit.</span>
                              <span className="text-sm font-bold text-slate-700">{formatCurrency(item.unitPrice || 0)}</span>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => handleTogglePurchase(p.protocolId, item.id)}
                              disabled={savingId === item.id}
                              className="bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                              {savingId === item.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              Dar Baixa (Comprado)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
