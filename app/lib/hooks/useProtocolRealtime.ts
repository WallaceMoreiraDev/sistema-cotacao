import { useEffect, useCallback, useState } from 'react';
import { createClient } from '../supabase/client';
import { fetchStock } from '../services/stockService';
import { getReservedStockAction } from '../actions/protocols';
import { getClientsAction } from '../actions/clients';
import type { StockProduct, Client } from '../types/database';

export function useProtocolRealtime(protocolId?: number) {
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  
  const [registeredClients, setRegisteredClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  // ── Refresh stock (called on load + on protocol_items/stock_products changes) ──
  const refreshStockData = useCallback(async () => {
    try {
      const [products, reservations] = await Promise.all([
        fetchStock(),
        getReservedStockAction(protocolId)
      ]);
      
      const realProducts = products.map(p => {
        const identifier = p.code || p.sku || p.name;
        const reservedData = reservations[identifier] || { total: 0, heldBy: [] };
        return {
          ...p,
          stock: Math.max(0, p.stock - reservedData.total),
          heldBy: reservedData.heldBy
        };
      });
      
      setStockProducts(realProducts);
    } catch (error) {
      console.error('Error refreshing stock data:', error);
    } finally {
      setStockLoading(false);
    }
  }, [protocolId]);

  // ── Refresh clients (called on load + on clients changes) ──
  const refreshClients = useCallback(async () => {
    try {
      const res = await getClientsAction();
      if (res.success && res.data) {
        setRegisteredClients(res.data);
      }
    } catch (error) {
      console.error('Error refreshing clients:', error);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    // ── Initial load ──
    refreshStockData();
    refreshClients();

    // ── Supabase Realtime Subscription ──
    const supabase = createClient();
    const channelName = protocolId ? `protocol-changes-${protocolId}` : 'protocol-changes-novo';
    
    const channel = supabase.channel(channelName)
      // Mudanças nos itens do protocolo → atualiza estoque reservado
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'protocol_items' 
      }, () => {
        refreshStockData();
      })
      // Mudanças nos protocolos → atualiza reservas
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'protocols' 
      }, () => {
        refreshStockData();
      })
      // Mudanças no estoque físico (via webhook Bling) → atualiza disponibilidade
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'stock_products' 
      }, () => {
        refreshStockData();
      })
      // Novos clientes sincronizados (via webhook ou sync manual) → atualiza autocomplete
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'clients' 
      }, () => {
        refreshClients();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [refreshStockData, refreshClients, protocolId]);

  return { 
    stockProducts, 
    setStockProducts, 
    stockLoading, 
    registeredClients, 
    refreshStockData,
    clientsLoading
  };
}
