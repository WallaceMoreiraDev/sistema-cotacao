import { ProtocolItem } from '../../../lib/types/database';
import { Truck } from 'lucide-react';
import { useMemo } from 'react';

interface GestaoFretesProps {
  aCotarItems: ProtocolItem[];
  suppliers: any[];
  supplierFreights: Record<string, number>;
  updateSupplierFreight: (supplierId: string, cost: number) => void;
  isViewing: boolean;
}

export default function GestaoFretes({
  aCotarItems,
  suppliers,
  supplierFreights,
  updateSupplierFreight,
  isViewing
}: GestaoFretesProps) {
  // Extract unique supplier IDs that are actually used in the current "A Cotar" list
  const activeSupplierIds = useMemo(() => {
    const ids = new Set<string>();
    aCotarItems.forEach(item => {
      if (item.supplierId) {
        ids.add(String(item.supplierId));
      }
    });
    return Array.from(ids);
  }, [aCotarItems]);

  if (activeSupplierIds.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <Truck className="w-5 h-5 text-indigo-500" />
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Custos de Frete por Fornecedor
        </h3>
      </div>
      
      <p className="text-xs text-slate-500 mb-5">
        Defina o valor do frete para cada fornecedor envolvido nesta cotação. O valor será rateado automaticamente nos itens "A Cotar".
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {activeSupplierIds.map(supplierId => {
          const supplier = suppliers.find(s => String(s.id) === supplierId);
          const currentFreight = supplierFreights[supplierId] || 0;

          return (
            <div key={supplierId} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700 uppercase truncate" title={supplier?.name || 'Fornecedor Desconhecido'}>
                {supplier?.name || 'Fornecedor Desconhecido'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                  R$
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={isViewing}
                  value={currentFreight || ''}
                  placeholder="0.00"
                  onChange={(e) => updateSupplierFreight(supplierId, parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 font-semibold bg-white border border-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 transition-colors"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
