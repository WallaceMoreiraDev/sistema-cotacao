import { formatCurrency } from '../../../lib/utils/protocolFormatters';

interface FooterAcoesProps {
  totals: { totalEstoque: number; totalACotar: number; total: number; subtotal: number; markup: number };
  canFinalize: boolean;
  allItemsCount: number;
  triggerSaveCheck: (actionType: 'draft' | 'efetivar') => void;
  isViewing?: boolean;
  protocolStatus?: string;
  isLoading?: boolean;
}

export function FooterAcoes({
  totals,
  canFinalize,
  allItemsCount,
  triggerSaveCheck,
  isViewing = false,
  protocolStatus = 'draft',
  isLoading = false,
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
          <div className="group relative">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-400 shadow-xs cursor-not-allowed"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Exportar Relatório
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
              <div className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] text-white shadow-lg whitespace-nowrap">
                Em breve: gera lista de itens a cotar para fornecedores
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 h-2 w-2 bg-slate-900" />
              </div>
            </div>
          </div>

          <div className="group relative">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-400 shadow-xs cursor-not-allowed"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              Enviar para Bling
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
              <div className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] text-white shadow-lg whitespace-nowrap">
                Em breve: envia pedido de venda para o Bling ERP
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 h-2 w-2 bg-slate-900" />
              </div>
            </div>
          </div>

          {!isViewing && (
            <>
              {protocolStatus === 'draft' && (
                <button
                  type="button"
                  onClick={() => triggerSaveCheck('draft')}
                  disabled={!canFinalize || isLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-4 w-4 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  )}
                  {isLoading ? 'Salvando...' : 'Salvar Rascunho'}
                </button>
              )}

              <button
                type="button"
                onClick={() => triggerSaveCheck('efetivar')}
                disabled={!canFinalize || isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F7C00C] px-5 py-2.5 text-xs font-bold text-slate-900 shadow-sm transition-all hover:bg-[#E8B600] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="animate-spin h-4 w-4 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                )}
                {isLoading ? 'Processando...' : (protocolStatus === 'draft' ? 'Efetivar (Em Andamento)' : 'Salvar Alterações')}
              </button>
            </>
          )}
        </div>
      </div>

      {!canFinalize && allItemsCount === 0 && !isViewing && (
        <p className="mt-3 text-[11px] text-slate-400">Adicione pelo menos 1 item para finalizar o protocolo.</p>
      )}
    </div>
  );
}
