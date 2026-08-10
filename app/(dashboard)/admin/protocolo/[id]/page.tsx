import { getProtocolLogsAction, getProtocolByIdAction } from '../../../../lib/actions/protocols';
import { TimelineLogs } from '../../components/TimelineLogs';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminProtocolTimelinePage({ params }: { params: { id: string } }) {
  // Wait for the ID
  const resolvedParams = await params;
  
  if (!resolvedParams?.id) {
    redirect('/admin/protocolos');
  }

  const { data: protocol } = await getProtocolByIdAction(resolvedParams.id);
  const { data: logs } = await getProtocolLogsAction(resolvedParams.id);

  if (!protocol) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Protocolo não encontrado.
        </div>
        <Link href="/admin/protocolos" className="mt-4 inline-block text-blue-600 hover:underline">
          &larr; Voltar para a lista
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/admin/protocolos"
            className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Linha do Tempo
            </h1>
            <p className="text-sm text-slate-500">
              Protocolo #{protocol.id} • {protocol.clientName}
            </p>
          </div>
        </div>
        
        {/* Status bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Atual</span>
            <div className="mt-1 font-medium text-slate-800 capitalize">
              {protocol.status.replace('_', ' ')}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Criado em</span>
            <div className="mt-1 font-medium text-slate-800">
              {new Date(protocol.createdAt).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</span>
            <div className="mt-1 font-medium text-slate-800">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(protocol.totals?.total ?? 0)}
            </div>
          </div>
        </div>

        {/* Timeline Component */}
        <div className="bg-white/50 rounded-2xl p-6 border border-slate-200 shadow-sm">
          <TimelineLogs logs={logs || []} />
        </div>
      </div>
    </div>
  );
}
