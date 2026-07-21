import { Fragment } from 'react';
import type { ProtocolItem } from '../../../lib/types/database';

interface ModalDeficitEstoqueProps {
  isOpen: boolean;
  deficitItems: { item: ProtocolItem; maxAvailable: number; deficit: number }[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ModalDeficitEstoque({
  isOpen,
  deficitItems,
  onConfirm,
  isLoading,
}: ModalDeficitEstoqueProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-red-500/10 p-5 border-b border-red-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Déficit de Estoque</h3>
              <p className="text-xs text-slate-500 mt-0.5">Estes itens perderam disponibilidade enquanto você editava.</p>
            </div>
          </div>
        </div>
        
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            As quantidades solicitadas para os itens abaixo ultrapassam o estoque físico atual. 
            O excedente será obrigatoriamente movido para a lista <strong className="text-slate-900">A Cotar</strong> para prosseguir.
          </p>
          
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-bold text-slate-500">Item</th>
                  <th className="px-3 py-2 font-bold text-slate-500 text-center">Solicitado</th>
                  <th className="px-3 py-2 font-bold text-emerald-600 text-center">Disponível</th>
                  <th className="px-3 py-2 font-bold text-red-600 text-center">Déficit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {deficitItems.map((entry, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-800">{entry.item.name}</p>
                      <p className="text-[10px] text-slate-500">{entry.item.code || entry.item.oem || '-'}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium text-slate-600">{entry.item.quantity}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{entry.maxAvailable}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-red-600">-{entry.deficit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 p-4 shrink-0">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            Entendi, mover {deficitItems.reduce((acc, curr) => acc + curr.deficit, 0)} un. para Cotação
          </button>
        </div>
      </div>
    </div>
  );
}
