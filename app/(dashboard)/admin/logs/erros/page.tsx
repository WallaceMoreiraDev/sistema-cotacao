'use client';

import React, { useEffect, useState } from 'react';
import { getSystemErrorsAction, SystemErrorLog } from '@/app/lib/actions/systemErrors';
import { AlertCircle, Terminal, Clock, RefreshCw } from 'lucide-react';
import { AdminLogsTabs } from '../components/AdminLogsTabs';

export default function ErrorLogsPage() {
  const [logs, setLogs] = useState<SystemErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const res = await getSystemErrorsAction(100);
    if (res.success) {
      setLogs(res.data || []);
    } else {
      setErrorMsg(res.error || 'Erro ao carregar logs.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <AdminLogsTabs />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6 w-full">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Terminal className="w-6 h-6 text-red-600" />
            Logs de Erros do Sistema
          </h1>
          <p className="text-gray-500 mt-1">Acompanhamento de falhas em integrações e processos internos.</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="text-sm text-red-700 font-medium">{errorMsg}</div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p>Carregando logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>Nenhum erro registrado recentemente. Tudo funcionando perfeitamente!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-medium">
                <tr>
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Protocolo ID</th>
                  <th className="px-6 py-4 w-1/2">Mensagem</th>
                  <th className="px-6 py-4">Detalhes Técnicos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        {log.error_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {log.protocol_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-normal min-w-[300px]">
                      <span className="text-gray-900 font-medium">{log.message}</span>
                    </td>
                    <td className="px-6 py-4 relative group">
                      <details className="group">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium text-xs select-none">
                          Ver JSON
                        </summary>
                        <div className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-md overflow-x-auto text-xs font-mono w-96 max-w-xl whitespace-pre-wrap absolute z-[99] shadow-xl border border-gray-700 right-0 top-full">
                          {log.details ? JSON.stringify(log.details, null, 2) : 'Sem detalhes'}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
