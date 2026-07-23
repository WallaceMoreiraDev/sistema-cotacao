import { formatCurrency } from '../../../lib/utils/protocolFormatters';

interface FooterAcoesProps {
  totals: { totalEstoque: number; totalACotar: number; total: number; subtotal: number; markup: number };
  canFinalize: boolean;
  allItemsCount: number;
  isViewing?: boolean;
  protocolStatus?: string;
  isLoading?: boolean;
  canSendToBling: boolean;
  onSaveDraft: () => void;
  onReservar: () => void;
  onEnviarBling: () => void;
  onCancelar: () => void;
  onEstornar?: () => void;
  onRestaurar?: () => void;
}

export function FooterAcoes({
  totals,
  canFinalize,
  allItemsCount,
  isViewing = false,
  protocolStatus = 'nao_reservado',
  isLoading = false,
  canSendToBling,
  onSaveDraft,
  onReservar,
  onEnviarBling,
  onCancelar,
  onEstornar,
  onRestaurar,
}: FooterAcoesProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Estoque</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totals.totalEstoque ?? 0)}</p>
          </div>
          <div className="text-slate-300 text-lg font-light">+</div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total a Cotar</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totals.totalACotar ?? 0)}</p>
          </div>
          <div className="text-slate-300 text-lg font-light">=</div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Preço de Venda Total</p>
            <p className="text-xl font-black text-[#F7C00C]">{formatCurrency(totals.total)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          
          {protocolStatus === 'finalizado' ? (
            <button
              type="button"
              onClick={onEstornar}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-100 px-5 py-2.5 text-xs font-bold text-orange-700 shadow-sm transition-all hover:bg-orange-200 disabled:opacity-40"
            >
              Estornar Protocolo
            </button>
          ) : (
            <>
              {protocolStatus !== 'cancelado' && (
                <button
                  type="button"
                  onClick={onCancelar}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-red-600 shadow-sm transition-all hover:bg-red-50 disabled:opacity-40"
                >
                  Cancelar Cotação
                </button>
              )}

              {protocolStatus === 'nao_reservado' && (
                <button
                  type="button"
                  onClick={onReservar}
                  disabled={isLoading || !canFinalize}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-700 disabled:opacity-40"
                >
                  Reservar Estoque
                </button>
              )}
              
              {protocolStatus !== 'cancelado' && (
                <div className="group relative">
                  <button
                    type="button"
                    onClick={onEnviarBling}
                    disabled={isLoading || !canSendToBling}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F7C00C] px-5 py-2.5 text-xs font-bold text-slate-900 shadow-sm transition-all hover:bg-[#E8B600] disabled:opacity-40"
                  >
                    Enviar para Bling
                  </button>
                  {!canSendToBling && (
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-20 w-48">
                      <div className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] text-white shadow-lg text-center">
                        Resolva pendências de preço e aprovação antes de enviar.
                        <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 h-2 w-2 bg-slate-900" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {protocolStatus === 'cancelado' && (
            <button
              type="button"
              onClick={onRestaurar}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-40"
            >
              Restaurar Protocolo
            </button>
          )}

          {!isViewing && protocolStatus === 'nao_reservado' && (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isLoading || !canFinalize}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Salvar Alterações
            </button>
          )}

        </div>
      </div>

      {!canFinalize && allItemsCount === 0 && !isViewing && (
        <p className="mt-3 text-[11px] text-slate-400">Adicione pelo menos 1 item para prosseguir.</p>
      )}
    </div>
  );
}
