'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPendingApprovalsAction, approveItemAction, rejectItemAction, approveWithCustomMarkupAction } from '@/app/lib/actions/protocols';
import { getDefaultMarkup } from '@/app/lib/config/suppliers';

export default function AdminAprovacoesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterProtocol, setFilterProtocol] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');
  
  // Custom Markups
  const [customMarkups, setCustomMarkups] = useState<Record<string, string>>({});

  const loadApprovals = async () => {
    setLoading(true);
    const result = await getPendingApprovalsAction();
    if (result.success && result.data) {
      setItems(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleApprove = async (itemId: string) => {
    const res = await approveItemAction(itemId);
    if (res.success) {
      loadApprovals();
    } else {
      alert('Erro ao aprovar item');
    }
  };

  const handleReject = async (item: any) => {
    const defaultMk = item.chosenSupplierType ? getDefaultMarkup(item.chosenSupplierType) : 0;
    const basePrice = item.unitPrice || 0;
    
    const res = await rejectItemAction(item.id, defaultMk, basePrice);
    if (res.success) {
      loadApprovals();
    } else {
      alert('Erro ao rejeitar item');
    }
  };

  const handleCustomApprove = async (item: any) => {
    let customValue = customMarkups[item.id];
    let numericValue = Number(customValue?.replace(',', '.'));
    
    if (!customValue || isNaN(numericValue)) {
      return handleApprove(item.id); // Default approve if empty
    }
    
    const res = await approveWithCustomMarkupAction(item.id, numericValue, item.unitPrice || 0);
    if (res.success) {
      loadApprovals();
    } else {
      alert('Erro ao aprovar item com markup customizado');
    }
  };

  const filteredItems = items.filter(item => {
    const protocolMatch = filterProtocol === '' || String(item.protocol?.id).includes(filterProtocol);
    const clientMatch = filterClient === '' || item.protocol?.client_name?.toLowerCase().includes(filterClient.toLowerCase());
    const itemMatch = filterItem === '' || 
      item.name?.toLowerCase().includes(filterItem.toLowerCase()) || 
      item.brand?.toLowerCase().includes(filterItem.toLowerCase()) ||
      item.oem?.toLowerCase().includes(filterItem.toLowerCase());
      
    const supplierMatch = filterSupplier === 'all' || item.chosenSupplierType === filterSupplier;
    
    return protocolMatch && clientMatch && itemMatch && supplierMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Aprovações Pendentes</h1>
        <button 
          onClick={loadApprovals} 
          disabled={loading}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm border hover:bg-slate-50 transition"
        >
          {loading ? 'Atualizando...' : 'Atualizar Lista'}
        </button>
      </div>

      {/* Filtros Combinados */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtros de Busca</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nº Protocolo</label>
            <input
              type="text"
              placeholder="Ex: 1001"
              value={filterProtocol}
              onChange={(e) => setFilterProtocol(e.target.value)}
              className="block w-full rounded-lg border-0 py-1.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6"
            />
          </div>
          <div className="relative">
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Cliente</label>
            <input
              type="text"
              placeholder="Nome do cliente..."
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="block w-full rounded-lg border-0 py-1.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6"
            />
          </div>
          <div className="relative">
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Item (Nome, Marca, OEM)</label>
            <input
              type="text"
              placeholder="Nome do item..."
              value={filterItem}
              onChange={(e) => setFilterItem(e.target.value)}
              className="block w-full rounded-lg border-0 py-1.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6"
            />
          </div>
          <div className="relative">
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tipo de Fornecedor</label>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="block w-full rounded-lg border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-emerald-600 sm:text-sm sm:leading-6"
            >
              <option value="all">Todos os Fornecedores</option>
              <option value="Mercado Local">Mercado Local</option>
              <option value="Fornecedor Original">Fornecedor Original</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500">
            <svg className="h-16 w-16 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium text-slate-600">Tudo limpo por aqui!</p>
            <p className="text-sm">Não há nenhum item aguardando aprovação no momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 font-semibold text-slate-700">Protocolo / Cliente</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Item</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Fornecedor</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Markup</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Preços</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const defaultMk = item.chosenSupplierType ? getDefaultMarkup(item.chosenSupplierType) : 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-4 align-top">
                        <Link href={`/protocolo/${item.protocol.id}`} className="font-bold text-amber-600 hover:underline">
                          #{item.protocol.id}
                        </Link>
                        <div className="text-slate-900 font-medium mt-1">{item.protocol.client_name}</div>
                        <div className="text-xs text-slate-400 mt-1">{item.protocol.title}</div>
                      </td>
                      
                      <td className="px-4 py-4 align-top">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                          {item.brand && <div>Marca: {item.brand}</div>}
                          {item.oem && <div>OEM: {item.oem}</div>}
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 align-top">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {item.chosenSupplierType || 'Desconhecido'}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-500">
                            Padrão: <strong className="text-slate-700">{defaultMk}%</strong>
                          </span>
                          <span className="text-sm">
                            Solicitado: <strong className="text-amber-600">{item.markupPercent}%</strong>
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="text-slate-500">Custo: R$ {(item.unitPrice || 0).toFixed(2)}</span>
                          <span className="text-slate-900 font-bold">Venda: R$ {(item.salePrice || 0).toFixed(2)}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <div className="relative w-full">
                              <input
                                type="number"
                                placeholder={String(item.markupPercent)}
                                value={customMarkups[item.id] !== undefined ? customMarkups[item.id] : ''}
                                onChange={(e) => setCustomMarkups({ ...customMarkups, [item.id]: e.target.value })}
                                className="block w-full rounded-lg border-0 py-1.5 pl-2 pr-6 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-emerald-600 sm:text-xs text-center"
                              />
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                            </div>
                            <button
                              onClick={() => handleCustomApprove(item)}
                              className="inline-flex justify-center items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 transition whitespace-nowrap"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              Aprovar
                            </button>
                          </div>
                          
                          <button
                            onClick={() => {
                              if (confirm('Tem certeza que deseja rejeitar este markup? O item voltará ao markup padrão.')) {
                                handleReject(item);
                              }
                            }}
                            className="w-full inline-flex justify-center items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm hover:bg-red-100 hover:text-red-800 transition"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Rejeitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
