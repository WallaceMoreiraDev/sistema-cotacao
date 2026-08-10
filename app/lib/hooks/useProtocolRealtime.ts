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

  useEffect(() => {
    let cancelled = false;
    
    // Initial load
    refreshStockData();

    // Supabase Realtime Subscription
    const supabase = createClient();
    const channelName = protocolId ? `protocol-changes-${protocolId}` : 'protocol-changes-novo';
    
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'protocol_items' 
      }, () => {
        refreshStockData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'protocols' 
      }, () => {
        refreshStockData();
      })
      .subscribe();

    // Load initial static data
    getClientsAction().then(res => { 
      if (!cancelled && res.success && res.data) {
        setRegisteredClients(res.data); 
      }
      if (!cancelled) setClientsLoading(false);
    });
    

    return () => { 
      cancelled = true; 
      supabase.removeChannel(channel); 
    };
  }, [refreshStockData, protocolId]);

  return { 
    stockProducts, 
    setStockProducts, 
    stockLoading, 
    registeredClients, 
    refreshStockData,
    clientsLoading
  };
}
