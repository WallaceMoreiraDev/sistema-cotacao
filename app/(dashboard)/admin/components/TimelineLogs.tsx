'use client';

import React, { useState } from 'react';

interface LogEntry {
  id: string;
  protocol_id: number;
  user_name: string;
  user_role: string;
  user_sector: string;
  action_type: string;
  description: string;
  metadata?: any;
  created_at: string;
}

interface SnapshotData {
  oldClientName?: string;
  newClientName?: string;
  oldItems?: any[];
  newItems?: any[];
}

function renderItemSpecs(item: any) {
  const specs = [];
  if (item.code) specs.push(`Cód: ${item.code}`);
  if (item.oem) specs.push(`OEM: ${item.oem}`);
  if (item.brand) specs.push(`Marca: ${item.brand}`);
  
  const m = item.measurements || {};
  const measStr = [
    m.innerDiameter ? `Int: ${m.innerDiameter}` : null,
    m.outerDiameter ? `Ext: ${m.outerDiameter}` : null,
    m.height1 ? `Alt1: ${m.height1}` : null,
    m.height2 ? `Alt2: ${m.height2}` : null,
    m.thickness ? `Esp: ${m.thickness}` : null,
    m.cs ? `CS: ${m.cs}` : null,
  ].filter(Boolean).join(' | ');

  if (measStr) specs.push(`Medidas: [ ${measStr} ]`);

  if (specs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {specs.map((s, idx) => (
        <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600 border border-slate-200/60 font-mono">
          {s}
        </span>
      ))}
    </div>
  );
}

function VisualSnapshotDiff({ snapshot }: { snapshot: SnapshotData }) {
  const { oldClientName, newClientName, oldItems = [], newItems = [] } = snapshot;

  const clientChanged = oldClientName && oldClientName !== newClientName;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4 animate-in fade-in duration-200 text-xs">
      {/* Client change banner if present */}
      {clientChanged && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-medium">
          <span className="font-bold">Cliente Alterado:</span>
          <span className="line-through text-amber-700">{oldClientName}</span>
          <span>➔</span>
          <span className="font-bold text-amber-950">{newClientName}</span>
        </div>
      )}

      {/* Items Comparison Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="bg-slate-100/70 px-3 py-2 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
          <span>Comparativo de Itens</span>
          <span className="text-[10px] text-slate-500 font-normal">
            {oldItems.length} no passado ➔ {newItems.length} no presente
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {newItems.map((nItem) => {
            const isNewItem = String(nItem.id).startsWith('item-');
            const oItem = !isNewItem ? oldItems.find(o => String(o.id) === String(nItem.id)) : null;

            if (!oItem) {
              // Added Item
              return (
                <div key={nItem.id} className="p-3 bg-emerald-50/50 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        + ADICIONADO
                      </span>
                      <span className="font-semibold text-slate-800">{nItem.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {nItem.type === 'estoque' ? 'Estoque' : 'A Cotar'}
                      </span>
                    </div>
                    {renderItemSpecs(nItem)}
                  </div>
                  <div className="font-bold text-emerald-700 shrink-0">
                    {nItem.quantity} un.
                  </div>
                </div>
              );
            }

            const qtyChanged = Number(oItem.quantity) !== Number(nItem.quantity);

            return (
              <div key={nItem.id} className={`p-3 flex items-start justify-between gap-3 ${qtyChanged ? 'bg-amber-50/40' : 'bg-white'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    {qtyChanged ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        ⚡ MODIFICADO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                        MANTIDO
                      </span>
                    )}
                    <span className="font-semibold text-slate-800">{nItem.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {nItem.type === 'estoque' ? 'Estoque' : 'A Cotar'}
                    </span>
                  </div>
                  {renderItemSpecs(nItem)}
                </div>
                <div className="font-medium text-slate-700 shrink-0">
                  {qtyChanged ? (
                    <div className="flex items-center gap-1.5">
                      <span className="line-through text-slate-400">{oItem.quantity} un.</span>
                      <span>➔</span>
                      <span className="font-bold text-amber-900">{nItem.quantity} un.</span>
                    </div>
                  ) : (
                    <span>{nItem.quantity} un.</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Render Removed Items */}
          {oldItems
            .filter(o => !newItems.some(n => String(n.id) === String(o.id)))
            .map((oItem) => (
              <div key={oItem.id} className="p-3 bg-red-50/50 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                      - REMOVIDO
                    </span>
                    <span className="font-semibold text-slate-800 line-through">{oItem.name}</span>
                  </div>
                  {renderItemSpecs(oItem)}
                </div>
                <div className="font-medium text-red-700 line-through shrink-0">
                  {oItem.quantity} un.
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function LogItem({ log }: { log: LogEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const date = new Date(log.created_at);
  const hasSnapshot = log.metadata?.snapshot;

  const getActionStyle = (type: string) => {
    switch (type) {
      case 'protocol_created':
        return { color: 'bg-emerald-500', icon: '📝' };
      case 'status_change':
        return { color: 'bg-blue-500', icon: '🔄' };
      case 'markup_approved':
        return { color: 'bg-green-500', icon: '✅' };
      case 'markup_rejected':
        return { color: 'bg-red-500', icon: '❌' };
      case 'item_split':
      case 'bulk_item_split':
        return { color: 'bg-amber-500', icon: '✂️' };
      case 'bulk_item_realloc':
        return { color: 'bg-indigo-500', icon: '♻️' };
      case 'auto_save_diff':
        return { color: 'bg-slate-400', icon: '✏️' };
      default:
        return { color: 'bg-gray-400', icon: '📋' };
    }
  };

  const style = getActionStyle(log.action_type);

  return (
    <div className="relative pl-8">
      {/* Timeline dot/icon */}
      <div className={`absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white ${style.color} shadow-sm`}>
        <span className="text-xs">{style.icon}</span>
      </div>
      
      {/* Content Box */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative">
        <div className="absolute top-4 -left-2 w-4 h-4 bg-white border-t border-l border-slate-100 transform -rotate-45" />
        
        {/* Header */}
        <div className="flex items-start justify-between mb-2 gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              {log.user_name}
              <span className="font-normal text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                {log.user_role} • {log.user_sector}
              </span>
            </h4>
          </div>
          <time className="text-xs text-slate-400 whitespace-nowrap font-medium" title={date.toLocaleString('pt-BR')}>
            {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
        
        {/* Body (Description) */}
        <div className="mt-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-line border border-slate-100/50 leading-relaxed">
          {log.description}
        </div>

        {/* Expandable Details */}
        {hasSnapshot && (
          <div className="mt-3">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <svg 
                className={`w-3.5 h-3.5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {isExpanded ? 'Ocultar detalhes completos' : 'Ver todos os detalhes antes/depois'}
            </button>

            {isExpanded && (
              <VisualSnapshotDiff snapshot={log.metadata.snapshot} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface TimelineLogsProps {
  logs: LogEntry[];
}

export function TimelineLogs({ logs }: TimelineLogsProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
        <p className="text-slate-500 text-sm">Nenhum histórico encontrado para este protocolo.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="relative border-l-2 border-slate-200 ml-6 space-y-8">
        {logs.map((log) => (
          <LogItem key={log.id} log={log} />
        ))}
        
        {/* End of timeline indicator */}
        <div className="relative pl-8">
          <div className="absolute -left-[9px] top-2 h-4 w-4 rounded-full bg-slate-200 border-4 border-white" />
        </div>
      </div>
    </div>
  );
}
