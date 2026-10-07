import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  syncBlingCategoriesPageAction,
  syncBlingProductsPageAction,
  syncBlingProductSuppliersPageAction,
  syncBlingStockPageAction,
  syncBlingContactsPageAction,
} from '../actions/sync';

export function useBlingSync() {
  const [syncProgress, setSyncProgress] = useState<{ id: string; message: string; subMessage?: string } | null>(null);

  const runPaginatedSync = async (
    id: string,
    initialMessage: string,
    action: (page: number) => Promise<{ success: boolean; message?: string; hasMore: boolean; error?: string }>,
    onCompleteMessage: string
  ) => {
    if (syncProgress) {
      toast.error('Já existe uma sincronização em andamento.');
      return;
    }

    try {
      let page = 1;
      let hasMore = true;
      let totalUpdated = 0;
      let totalCreated = 0;

      while (hasMore) {
        setSyncProgress({ id, message: `${initialMessage} (Página ${page}...)` });
        
        const res = await action(page);
        
        if (!res.success) {
          throw new Error(res.error || 'Erro desconhecido na sincronização.');
        }

        // Try to parse counts from message if possible, or just keep the latest message
        setSyncProgress({ 
          id, 
          message: `${initialMessage} (Página ${page} OK)`,
          subMessage: res.message
        });

        hasMore = res.hasMore;
        page++;
      }

      toast.success(onCompleteMessage);
    } catch (err: any) {
      console.error(`Sync error (${id}):`, err);
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSyncProgress(null);
    }
  };

  const syncCategories = () => runPaginatedSync('categories', 'Puxando Categorias', syncBlingCategoriesPageAction, 'Categorias sincronizadas com sucesso!');
  
  const syncProducts = async () => {
    if (syncProgress) return toast.error('Sincronização em andamento.');
    try {
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        setSyncProgress({ id: 'products', message: `1/2: Puxando Produtos (Página ${page}...)` });
        const res = await syncBlingProductsPageAction(page);
        if (!res.success) throw new Error(res.error);
        setSyncProgress({ id: 'products', message: `1/2: Produtos OK`, subMessage: res.message });
        hasMore = res.hasMore;
        page++;
      }

      page = 1;
      hasMore = true;
      while (hasMore) {
        setSyncProgress({ id: 'products', message: `2/2: Vinculando Custos/Fornecedores (Página ${page}...)` });
        const res = await syncBlingProductSuppliersPageAction(page);
        if (!res.success) throw new Error(res.error);
        setSyncProgress({ id: 'products', message: `2/2: Custos OK`, subMessage: res.message });
        hasMore = res.hasMore;
        page++;
      }

      toast.success('Produtos e custos sincronizados com sucesso!');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSyncProgress(null);
    }
  };

  const syncStock = () => runPaginatedSync('stock', 'Sincronizando Estoques', syncBlingStockPageAction, 'Estoques sincronizados com sucesso!');
  
  const syncContacts = () => runPaginatedSync('contacts', 'Puxando Clientes', syncBlingContactsPageAction, 'Clientes sincronizados com sucesso!');

  return {
    syncProgress,
    syncCategories,
    syncProducts,
    syncStock,
    syncContacts
  };
}
