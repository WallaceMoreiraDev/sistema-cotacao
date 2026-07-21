import { Fragment } from 'react';

interface ModalDivisaoEstoqueProps {
  isOpen: boolean;
  onClose: () => void;
  requestedQty: number;
  maxStock: number;
  itemName: string;
  onConfirm: () => void;
}

export function ModalDivisaoEstoque({
  isOpen,
  onClose,
  requestedQty,
  maxStock,
  itemName,
  onConfirm,
}: ModalDivisaoEstoqueProps) {
  if (!isOpen) return null;

  const excess = requestedQty - maxStock;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="bg-amber-500/10 p-5 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Estoque Insuficiente</h3>
              <p className="text-xs text-slate-500 mt-0.5">Limite de peças atingido para {itemName}</p>
            </div>
          </div>
        </div>
        
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Você solicitou <strong className="text-slate-900">{requestedQty} unidades</strong>, mas existem apenas <strong className="text-slate-900">{maxStock} unidades</strong> disponíveis no estoque local.
          </p>
          
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-800 mb-2">Ação sugerida:</p>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Manter <strong>{maxStock} un.</strong> na lista Em Estoque.
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                Enviar <strong>{excess} un.</strong> faltantes para a lista A Cotar.
              </li>
            </ul>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-[#F7C00C] px-4 py-2.5 text-xs font-bold text-slate-900 shadow-sm transition hover:bg-[#E8B600]"
          >
            Dividir Quantidades
          </button>
        </div>
      </div>
    </div>
  );
}
