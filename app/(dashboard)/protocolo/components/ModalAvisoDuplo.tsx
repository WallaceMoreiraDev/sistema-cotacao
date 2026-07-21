import type { ProtocolItem } from '../../../lib/types/database';

interface ModalAvisoDuploProps {
  isOpen: boolean;
  onClose: () => void;
  reallocatableItems: { item: ProtocolItem; freeStock: number }[];
  onConfirmRealloc: () => void;
  onConfirmIgnore: () => void;
  isLoading?: boolean;
}

export function ModalAvisoDuplo({
  isOpen,
  onClose,
  reallocatableItems,
  onConfirmRealloc,
  onConfirmIgnore,
  isLoading,
}: ModalAvisoDuploProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Atenção: Estoque Liberado!</h3>
            <p className="mt-1 text-sm text-slate-500">
              Notamos que existem itens na sua lista "A Cotar" que agora possuem estoque disponível no sistema. Você deseja remanejá-los para o estoque antes de salvar?
            </p>
          </div>
        </div>
        
        <div className="mb-6 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
          <ul className="space-y-3 text-sm">
            {reallocatableItems.map(({ item, freeStock }) => (
              <li key={item.id} className="flex items-center justify-between border-b border-slate-200/50 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.code || item.oem || 'Sem código'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">{freeStock} un. disponíveis</p>
                  <p className="text-xs text-slate-400">Você pediu {item.quantity}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 p-4 shrink-0">
          <button
            onClick={onConfirmIgnore}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Ignorar e Salvar
          </button>
          <button
            onClick={onConfirmRealloc}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-[#F7C00C] px-4 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-[#E8B600] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            Remanejar Automático
          </button>
        </div>
      </div>
    </div>
  );
}
