import { createClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLogsTabs } from './components/AdminLogsTabs';

export default async function AdminLogsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Ensure user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch logs
  const { data: logs, error } = await supabase
    .from('vw_auth_logs_with_users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error("Erro ao buscar logs de autenticação:", error);
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">LOGIN</span>;
      case 'LOGOUT':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">LOGOUT</span>;
      case 'PASSWORD_CHANGE':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">TROCA DE SENHA</span>;
      case 'PASSWORD_RESET':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">REDEFINIÇÃO</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{action}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminLogsTabs />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-3xl bg-slate-900 p-8 shadow-xl relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-slate-800/50 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#F7C00C]/10 blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-6 items-center rounded-full bg-[#F7C00C]/20 px-2.5 text-xs font-bold text-[#F7C00C] ring-1 ring-inset ring-[#F7C00C]/20">
              Segurança
            </span>
            <span className="text-xs text-slate-400">· Área Administrativa</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl text-white">
            Monitoramento de Acessos
          </h1>
          <p className="mt-1.5 text-sm text-slate-300">
            Acompanhe o histórico de login, logout e troca de senhas de todos os usuários do sistema.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:px-6 sm:py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Últimos 100 Registros
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th scope="col" className="px-6 py-4">Data / Hora</th>
                <th scope="col" className="px-6 py-4">Usuário</th>
                <th scope="col" className="px-6 py-4">Função</th>
                <th scope="col" className="px-6 py-4">Ação</th>
                <th scope="col" className="px-6 py-4 hidden sm:table-cell">Endereço IP</th>
                <th scope="col" className="px-6 py-4 hidden lg:table-cell">Dispositivo (User-Agent)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {logs && logs.length > 0 ? (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          {new Date(log.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {log.user_name || 'Desconhecido'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        {log.user_role || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell text-slate-500 font-mono text-xs">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-slate-500 text-xs truncate max-w-[200px]" title={log.user_agent}>
                      {log.user_agent || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhum registro de acesso encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
