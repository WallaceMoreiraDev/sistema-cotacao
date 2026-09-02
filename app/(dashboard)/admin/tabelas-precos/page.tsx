'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { 
  getPriceTablesAction, 
  deletePriceTableAction, 
  importPriceTableItemsAction 
} from '../../../lib/actions/priceTables';
import { PriceTable, PriceTableItem } from '../../../lib/types/database';
import { getPriceTableItemsAction } from '../../../lib/actions/priceTables';

export default function TabelasPrecosPage() {
  const [tables, setTables] = useState<PriceTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number, total: number, status: string }>({ current: 0, total: 0, status: '' });
  const [viewingTable, setViewingTable] = useState<PriceTable | null>(null);
  const [tableItems, setTableItems] = useState<PriceTableItem[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setIsLoading(true);
    const { success, data } = await getPriceTablesAction();
    if (success && data) {
      setTables(data);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a tabela "${name}"? Isso afetará protocolos futuros, mas não os finalizados.`)) return;
    
    setIsLoading(true);
    const { success, message } = await deletePriceTableAction(id);
    if (success) {
      toast.success(message);
      setTables(tables.filter(t => t.id !== id));
    } else {
      toast.error(message);
    }
    setIsLoading(false);
  };

  const handleViewTable = async (table: PriceTable) => {
    setViewingTable(table);
    setIsItemsLoading(true);
    setTableItems([]);
    
    const { success, data } = await getPriceTableItemsAction(table.id);
    if (success && data) {
      setTableItems(data);
    } else {
      toast.error('Erro ao carregar itens da tabela');
    }
    
    setIsItemsLoading(false);
  };

  const processFiles = async (files: FileList) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length, status: 'Lendo arquivos...' });

    try {
      // 1. Parse all files and group by 'Nome lista'
      const groupedData: Record<string, { sku: string, price: number }[]> = {};
      let totalRows = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(p => ({ ...p, status: `Lendo arquivo ${i + 1} de ${files.length} (${file.name})...` }));
        
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
        
        for (const row of jsonData) {
          const nomeLista = row['Nome lista']?.toString().trim();
          const sku = row['SKU']?.toString().trim();
          let precoRaw = row['Preço'] ?? row['Preco'];
          
          if (!nomeLista || !sku || precoRaw === undefined) continue;

          // Parse price (handle string with comma)
          let preco = 0;
          if (typeof precoRaw === 'string') {
            preco = parseFloat(precoRaw.replace(/\./g, '').replace(',', '.'));
          } else {
            preco = Number(precoRaw);
          }

          if (isNaN(preco)) continue;

          if (!groupedData[nomeLista]) {
            groupedData[nomeLista] = [];
          }
          
          groupedData[nomeLista].push({ sku, price: preco });
          totalRows++;
        }
      }

      const listNames = Object.keys(groupedData);
      if (listNames.length === 0) {
        toast.error('Nenhum dado válido encontrado. Certifique-se de que as colunas "Nome lista", "SKU" e "Preço" existem no arquivo.');
        setIsProcessing(false);
        return;
      }

      // 2. Upload lists to server sequentially to avoid overloading
      setProgress({ current: 0, total: listNames.length, status: 'Salvando no banco de dados...' });
      
      let successCount = 0;
      for (let i = 0; i < listNames.length; i++) {
        const listName = listNames[i];
        const items = groupedData[listName];
        
        setProgress(p => ({ ...p, current: i + 1, status: `Sincronizando tabela: ${listName} (${items.length} itens)...` }));
        
        // Split into chunks of 1000 to avoid request too large errors if needed, but Supabase can handle a few thousand in one upsert easily.
        // Bling files are usually 1000 lines, so items.length is probably around 1000-5000.
        const res = await importPriceTableItemsAction(listName, items);
        
        if (res.success) {
          successCount++;
        } else {
          toast.error(`Erro ao importar ${listName}: ${res.message}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Importação concluída! ${totalRows} itens processados em ${listNames.length} tabelas.`);
        fetchTables();
      }

    } catch (error: any) {
      console.error(error);
      toast.error('Ocorreu um erro ao processar os arquivos.');
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0, status: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tabelas de Preços (Descontos)</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie listas de preços importadas do Bling</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo: Importador */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Importar do Bling</h3>
            <p className="text-xs text-slate-500 mb-6">
              Faça o upload do relatório de <strong>Listas de preços</strong> gerado no Bling. 
              Você pode selecionar vários arquivos de 1000 linhas ao mesmo tempo.
            </p>

            <div className="relative">
              <input 
                type="file" 
                multiple 
                accept=".xlsx, .xls, .csv" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                onChange={(e) => {
                  if (e.target.files) processFiles(e.target.files);
                }}
                disabled={isProcessing}
                ref={fileInputRef}
              />
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isProcessing ? 'border-slate-200 bg-slate-50' : 'border-[#F7C00C]/50 hover:bg-[#F7C00C]/5 bg-[#F7C00C]/10'}`}>
                {isProcessing ? (
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-[#F7C00C] rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-bold text-slate-900">{progress.status}</p>
                    {progress.total > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        {progress.current} / {progress.total}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <svg className="w-10 h-10 text-[#F7C00C] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p className="text-sm font-bold text-slate-700">Clique ou arraste arquivos aqui</p>
                    <p className="text-xs text-slate-500 mt-1">.xlsx, .csv</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Tabelas Existentes */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-sm min-h-full">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Tabelas Salvas no Sistema</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-[#F7C00C] rounded-full animate-spin"></div>
              </div>
            ) : tables.length === 0 ? (
              <div className="text-center p-12 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-500 text-sm">Nenhuma tabela de preço importada ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tables.map(table => (
                  <div key={table.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{table.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Importada em: {new Date(table.updatedAt || table.createdAt || '').toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewTable(table)}
                        disabled={isProcessing}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                        title="Ver detalhes"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(table.id, table.name)}
                        disabled={isProcessing}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                        title="Excluir tabela"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-[24px] p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-[#F7C00C] rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-black text-slate-900">Processando Tabelas...</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">{progress.status}</p>
            {progress.total > 0 && (
              <p className="text-xs font-bold text-slate-400 mt-4 bg-slate-50 py-2 rounded-lg">
                PASSO {progress.current} DE {progress.total}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal View Items */}
      {viewingTable && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-6 max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">{viewingTable.name}</h3>
                <p className="text-xs text-slate-500">Detalhes da tabela importada</p>
              </div>
              <button onClick={() => setViewingTable(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl">
              {isItemsLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : tableItems.length === 0 ? (
                <div className="text-center p-8">
                  <p className="text-slate-500 text-sm">Nenhum item cadastrado nesta tabela.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-800">SKU</th>
                      <th className="px-4 py-3 font-semibold text-slate-800 text-right">Preço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                        <td className="px-4 py-2 text-right font-medium text-emerald-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="mt-4 flex justify-between items-center text-xs text-slate-500">
              <p>Total de {tableItems.length} itens.</p>
              <button onClick={() => setViewingTable(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
