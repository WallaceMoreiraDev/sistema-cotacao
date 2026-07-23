import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Visão Geral do Sistema</h1>
        <p className="mt-2 text-sm text-slate-500">
          Bem-vindo à área de administração. Utilize o menu lateral para configurar parâmetros globais, categorias e gerenciar fornecedores.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center gap-3 mb-3 text-slate-700 font-bold">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Configurações
            </div>
            <p className="text-xs text-slate-500 mb-4">Ajuste o Markup Padrão e o Markup Mínimo do sistema para os protocolos.</p>
            <Link href="/admin/configuracoes" className="text-sm font-bold text-[#F7C00C] hover:text-[#E8B600]">
              Acessar Configurações &rarr;
            </Link>
          </div>
          
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center gap-3 mb-3 text-slate-700 font-bold">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              Categorias
            </div>
            <p className="text-xs text-slate-500 mb-4">Cadastre os tipos de vedação e defina dinamicamente quais medidas são exigidas.</p>
            <Link href="/admin/categorias" className="text-sm font-bold text-[#F7C00C] hover:text-[#E8B600]">
              Acessar Categorias &rarr;
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center gap-3 mb-3 text-slate-700 font-bold">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Fornecedores
            </div>
            <p className="text-xs text-slate-500 mb-4">Gerencie os fornecedores cadastrados e classifique como Mercado Local ou Original.</p>
            <Link href="/admin/fornecedores" className="text-sm font-bold text-[#F7C00C] hover:text-[#E8B600]">
              Acessar Fornecedores &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
