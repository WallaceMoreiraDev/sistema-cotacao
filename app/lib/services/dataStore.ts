import type { Protocol } from '../types/database';

const KEYS = {
  PROTOCOLS: '@vedacoes/protocols',
  CLIENTS: '@vedacoes/clients',
  PRODUCTS: '@vedacoes/products',
};

function get<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function set<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

export const DataStore = {
  // Protocolos
  getProtocols: () => get<Protocol>(KEYS.PROTOCOLS),
  saveProtocols: (protocols: Protocol[]) => set(KEYS.PROTOCOLS, protocols),
  getProtocol: (id: string) => get<Protocol>(KEYS.PROTOCOLS).find(p => p.id === id),
  addProtocol: (protocol: Protocol) => {
    const list = get<Protocol>(KEYS.PROTOCOLS);
    list.push(protocol);
    set(KEYS.PROTOCOLS, list);
    return protocol;
  },
  updateProtocol: (id: string, updates: Partial<Protocol>) => {
    const list = get<Protocol>(KEYS.PROTOCOLS);
    const index = list.findIndex(p => p.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
      set(KEYS.PROTOCOLS, list);
      return list[index];
    }
    return null;
  },
  // Clientes e Products (análogo)
};