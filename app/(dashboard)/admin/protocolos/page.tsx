import { getProtocolsAction } from '../../../lib/actions/protocols';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminProtocolosPage() {
  const { data: protocols } = await getProtocolsAction();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Protocolos</h1>
        <p className="text-sm text-slate-500 mt-1">Gestão e rastreamento de todos os protocolos do sistema</p>
      </div>
      
      <div className="bg-white rounded-[20px] shadow-sm border border-slate-200/80 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {protocols?.map((protocol) => (
              <tr key={protocol.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{protocol.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{protocol.clientName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${protocol.status === 'nao_reservado' ? 'bg-gray-100 text-gray-800' : 
                      protocol.status === 'reservado' ? 'bg-blue-100 text-blue-800' : 
                      protocol.status === 'finalizado' ? 'bg-green-100 text-green-800' : 
                      'bg-red-100 text-red-800'}`}>
                    {protocol.status === 'nao_reservado' ? 'Rascunho' :
                     protocol.status === 'reservado' ? 'Reservado' :
                     protocol.status === 'finalizado' ? 'Efetivado' : 'Cancelado'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(protocol.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link 
                    href={`/admin/protocolo/${protocol.id}`}
                    className="text-amber-600 hover:text-amber-900"
                  >
                    Ver Timeline
                  </Link>
                </td>
              </tr>
            ))}
            {(!protocols || protocols.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Nenhum protocolo encontrado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
