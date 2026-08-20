import { useEffect, useCallback, useState, useMemo } from 'react';
import { createClient } from '../supabase/client';
import { fetchStock } from '../services/stockService';
import { getReservedStockAction } from '../actions/protocols';
import { getClientsAction } from '../actions/clients';
import type { StockProduct, Client, StockHolder } from '../types/database';

export function useProtocolRealtime(protocolId?: number) {
  const [baseStock, setBaseStock] = useState<StockProduct[]>([]);
  const [reservations, setReservations] = useState<Record<string, { total: number, heldBy: StockHolder[] }>>({});
  const [stockLoading, setStockLoading] = useState(true);
  
  const [registeredClients, setRegisteredClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  // ── Derived Stock Products (Base - Reservations) ──
  const stockProducts = useMemo(() => {
    return baseStock.map(p => {
      const identifier = p.code || p.sku || p.name;
      const reservedData = reservations[identifier] || { total: 0, heldBy: [] };
      return {
        ...p,
        stock: Math.max(0, p.stock - reservedData.total),
        heldBy: reservedData.heldBy
      };
    });
  }, [baseStock, reservations]);

  // ── Network Fetchers ──
  const refreshBaseStock = useCallback(async () => {
    try {
      const products = await fetchStock();
      setBaseStock(products);
    } catch (error) {
      console.error('Error fetching base stock:', error);
    }
  }, []);

  const refreshReservations = useCallback(async () => {
    try {
      const data = await getReservedStockAction(protocolId);
      setReservations(data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  }, [protocolId]);

  const refreshStockData = useCallback(async () => {
    setStockLoading(true);
    await Promise.all([refreshBaseStock(), refreshReservations()]);
    setStockLoading(false);
  }, [refreshBaseStock, refreshReservations]);

  // Debounced reservation refresh (since we can't easily calculate reservations client-side)
  const refreshReservationsDebounced = useCallback(() => {
    if ((window as any)._reservationsRefreshTimer) clearTimeout((window as any)._reservationsRefreshTimer);
    (window as any)._reservationsRefreshTimer = setTimeout(() => refreshReservations(), 800);
  }, [refreshReservations]);

  // ── Clients Fetchers ──
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

  const refreshClientsDebounced = useCallback(() => {
    if ((window as any)._clientsRefreshTimer) clearTimeout((window as any)._clientsRefreshTimer);
    (window as any)._clientsRefreshTimer = setTimeout(() => refreshClients(), 800);
  }, [refreshClients]);

  useEffect(() => {
    // ── Initial load ──
    refreshStockData();
    refreshClients();

    const supabase = createClient();
    const channelName = `protocol_${protocolId || 'new'}_${Date.now()}`;

    const channel = supabase.channel(channelName)
      // ── Granular Stock Products Events (No Network Requests!) ──
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stock_products' }, (payload) => {
        setBaseStock(prev => prev.map(p => p.id === payload.new.id ? (payload.new as StockProduct) : p));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_products' }, (payload) => {
        setBaseStock(prev => [...prev, payload.new as StockProduct]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stock_products' }, (payload) => {
        setBaseStock(prev => prev.filter(p => p.id !== (payload.old as any).id));
      })
      
      // ── Reservations Events (Network Request, but debounced and lightweight) ──
      .on('postgres_changes', { event: '*', schema: 'public', table: 'protocol_items' }, () => {
        refreshReservationsDebounced();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'protocols' }, () => {
        refreshReservationsDebounced();
      })

      // ── Clients Events ──
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        refreshClientsDebounced();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if ((window as any)._reservationsRefreshTimer) clearTimeout((window as any)._reservationsRefreshTimer);
      if ((window as any)._clientsRefreshTimer) clearTimeout((window as any)._clientsRefreshTimer);
    };
  }, [refreshStockData, refreshClients, protocolId, refreshReservationsDebounced, refreshClientsDebounced]);

  return {
    stockProducts,
    stockLoading,
    registeredClients,
    clientsLoading,
    refreshStockData
  };
}
