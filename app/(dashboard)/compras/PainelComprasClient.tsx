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
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({}); // itemId -> protocolId

  // Parse raw protocols and group them
  const groupedData = useMemo(() => {
    const groups: Record<string, SupplierGroup> = {};

    protocols.forEach(proto => {
      if (!proto.items || !Array.isArray(proto.items)) return;

      const items: ProtocolItem[] = proto.items;
      
      // Filter items to buy
      const pendingItems = items.filter(
        i => i.type === 'a_cotar' && i.status !== 'comprado'
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

  // Handle batch purchasing
  const handleBatchPurchase = async () => {
    const itemIds = Object.keys(selectedItems);
    if (itemIds.length === 0) return;
    
    setIsSaving(true);
    
    // Group by protocol
    const protocolsToUpdate: Record<string, any> = {};
    const newProtocols = [...protocols];
    
    for (const [itemId, protoId] of Object.entries(selectedItems)) {
      if (!protocolsToUpdate[protoId]) {
        const pIndex = newProtocols.findIndex(p => String(p.id) === String(protoId));
        if (pIndex !== -1) {
          protocolsToUpdate[protoId] = { index: pIndex, proto: { ...newProtocols[pIndex] } };
        }
      }
    }

    // Apply updates locally and save
    let hasError = false;
    for (const protoId of Object.keys(protocolsToUpdate)) {
      const { index, proto } = protocolsToUpdate[protoId];
      
      // Update items
      const newItems = (proto.items as ProtocolItem[]).map(i => {
        if (selectedItems[i.id]) {
          return { ...i, status: 'comprado' };
        }
        return i;
      });
      
      proto.items = newItems;
      newProtocols[index] = proto;
      
      // Save protocol
      const res = await saveProtocolAction(proto);
      if (!res.success) {
        hasError = true;
      }
    }

    setProtocols(newProtocols);
    setSelectedItems({});
    setIsSaving(false);

    if (hasError) {
      alert('Erro ao salvar alguns protocolos. A página será recarregada.');
      window.location.reload();
    }
  };

  const toggleItemSelection = (itemId: string, protoId: string | number) => {
    setSelectedItems(prev => {
      const newSel = { ...prev };
      if (newSel[itemId]) delete newSel[itemId];
      else newSel[itemId] = String(protoId);
      return newSel;
    });
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
                            <input
                              type="checkbox"
                              checked={!!selectedItems[item.id]}
                              onChange={() => toggleItemSelection(item.id, p.protocolId)}
                              className="h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                            />
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
                              <span className="text-sm font-bold text-slate-700">
                                {item.supplierCosts?.[group.supplierId] ? formatCurrency(item.supplierCosts[group.supplierId]) : formatCurrency(item.unitPrice || 0)}
                              </span>
                            </div>
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

      {Object.keys(selectedItems).length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-8">
          <div className="flex flex-col">
            <span className="text-xs text-slate-300 font-medium tracking-wide">Selecionados</span>
            <span className="font-bold text-lg leading-tight">{Object.keys(selectedItems).length} itens</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <button
            onClick={handleBatchPurchase}
            disabled={isSaving}
            className="bg-brand hover:bg-brand/90 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg shadow-brand/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            Dar Baixa em Tudo
          </button>
        </div>
      )}
    </div>
  );
}
