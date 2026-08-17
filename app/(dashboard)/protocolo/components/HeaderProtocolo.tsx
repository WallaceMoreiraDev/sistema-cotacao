import { useState, useMemo } from 'react';
import type { Client } from '../../../lib/types/database';
import { formatCnpjMask, formatCpfMask } from '../../../lib/utils/protocolFormatters';

interface HeaderProtocoloProps {
  clientName: string;
  setClientName: (name: string) => void;
  registeredClients: Client[];
  protocolTitle: string;
  setProtocolTitle: (title: string) => void;
  protocolStatus?: string;
  autoSaveStatus: 'idle' | 'saving' | 'saved';
  isViewing?: boolean;
  clientsLoading?: boolean;
}

export function HeaderProtocolo({
  clientName,
  setClientName,
  registeredClients,
  protocolTitle,
  setProtocolTitle,
  protocolStatus = 'draft',
  autoSaveStatus,
  isViewing = false,
  clientsLoading = false,
}: HeaderProtocoloProps) {
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  const filteredClients = useMemo(() => {
    if (!clientName.trim()) return registeredClients;
    return registeredClients.filter((c) =>
      c.name.toLowerCase().includes(clientName.trim().toLowerCase())
    );
  }, [registeredClients, clientName]);

  const handleSelectClient = (client: Client) => {
    setClientName(client.name);
    setIsClientDropdownOpen(false);
  };

  const handleClientBlur = () => {
    setTimeout(() => {
      setIsClientDropdownOpen(false);
    }, 200);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'nao_reservado':
      case 'draft':
      case 'in_progress':
      case 'in_review':
      case 'rejected':
        return { label: 'Estoque Não Reservado', className: 'bg-slate-500/30 text-slate-300 border-slate-500/40' };
      case 'reservado':
      case 'separating':
        return { label: 'Estoque Reservado', className: 'bg-blue-500/30 text-blue-200 border-blue-400/50' };
      case 'finalizado':
      case 'approved':
        return { label: 'Finalizado', className: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50' };
      case 'cancelado':
        return { label: 'Cancelado', className: 'bg-red-500/30 text-red-200 border-red-400/50' };
      default:
        return { label: String(status), className: 'bg-slate-500/30 text-slate-300 border-slate-500/40' };
    }
  };

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <fieldset disabled={isViewing} className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#F7C00C] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-950">
              Protocolo
            </span>
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400 animate-pulse">
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvando...
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Salvo automaticamente
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Nome do Cliente *</span>
                {clientName.trim() && registeredClients.some(c => c.name.toLowerCase() === clientName.trim().toLowerCase()) ? (
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[9px]">Cliente Cadastrado</span>
                ) : clientName.trim() ? (
                  <span className="rounded-full bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 text-[9px]">Cliente Não Encontrado</span>
                ) : null}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={clientName}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    setIsClientDropdownOpen(true);
                  }}
                  onBlur={handleClientBlur}
                  placeholder="Digite para buscar seu cliente..."
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm font-medium text-white bg-white/5 placeholder-slate-500 outline-none transition ${
                    clientName.trim() ? 'border-slate-600 focus:border-[#F7C00C]' : 'border-amber-500/60 ring-1 ring-amber-500/20'
                  }`}
                />
                {clientsLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="h-4 w-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
              </div>

              {isClientDropdownOpen && !clientsLoading && filteredClients.length > 0 && !isViewing && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl">
                  <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Clientes Cadastrados</p>
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onMouseDown={() => handleSelectClient(client)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
                    >
                      <span className="font-semibold">{client.name}</span>
                      {client.cnpj && <span className="text-[10px] font-mono text-slate-400">{client.cnpj}</span>}
                    </button>
                  ))}
                </div>
              )}

              {!clientName.trim() && !isViewing && (
                <p className="mt-1 text-[10px] text-amber-400">Obrigatório para liberar o formulário de itens</p>
              )}
              {clientName.trim() && !registeredClients.some(c => c.name.toLowerCase() === clientName.trim().toLowerCase()) && !isViewing && (
                <p className="mt-1 text-[10px] text-red-400">Este cliente não existe na base. Cadastre no Bling primeiro.</p>
              )}
            </div>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Título (Opcional)</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider ${getStatusBadge(protocolStatus).className}`}>
                    {getStatusBadge(protocolStatus).label}
                  </span>
                </label>
                <input
                  type="text"
                  value={protocolTitle}
                  onChange={(e) => setProtocolTitle(e.target.value)}
                  placeholder="Ex: Cotação urgente cilindro..."
                  className="w-full rounded-xl border border-slate-600 bg-white/5 px-4 py-2.5 text-sm font-medium text-white placeholder-slate-500 outline-none transition focus:border-slate-400"
                />
              </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
