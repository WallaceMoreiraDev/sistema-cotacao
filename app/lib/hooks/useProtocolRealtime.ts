import { useEffect, useCallback, useState } from 'react';
import { createClient } from '../supabase/client';
import { fetchStock } from '../services/stockService';
import { getReservedStockAction } from '../actions/protocols';
import { getClientsAction } from '../actions/clients';
import { getSealTypesAction } from '../actions/sealTypes';
import type { StockProduct, Client, SealType } from '../types/database';

export function useProtocolRealtime(protocolId?: number) {
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  
  const [registeredClients, setRegisteredClients] = useState<Client[]>([]);
  const [registeredSealTypes, setRegisteredSealTypes] = useState<SealType[]>([]);

  const refreshStockData = useCallback(async () => {
    try {
      const [products, reservations] = await Promise.all([
        fetchStock(),
        getReservedStockAction(protocolId)
      ]);
      
      const realProducts = products.map(p => {
        const identifier = p.code || p.sku || p.name;
        const reserved = reservations[identifier] || 0;
        return {
          ...p,
          stock: Math.max(0, p.stock - reserved)
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
    const channelName = protocolId ? `protocol-items-changes-${protocolId}` : 'protocol-items-changes-novo';
    
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'protocol_items' 
      }, () => {
        refreshStockData();
      })
      .subscribe();

    // Load initial static data
    getClientsAction().then(res => { 
      if (!cancelled && res.success && res.data) {
        setRegisteredClients(res.data); 
      }
    });
    
    getSealTypesAction().then(res => { 
      if (!cancelled && res.success && res.data) {
        setRegisteredSealTypes(res.data); 
      }
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
    registeredSealTypes, 
    refreshStockData 
  };
}
