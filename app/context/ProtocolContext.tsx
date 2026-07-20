'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { Protocol } from '../lib/types/database';

type ProtocolContextValue = {
  protocols: Protocol[];
  addProtocol: (protocol: Protocol) => void;
};

const ProtocolContext = createContext<ProtocolContextValue | undefined>(undefined);

export function ProtocolProvider({ children }: { children: React.ReactNode }) {
  const [protocols, setProtocols] = useState<Protocol[]>([]);

  const addProtocol = (protocol: Protocol) => {
    setProtocols((current) => [protocol, ...current]);
  };

  const value = useMemo(() => ({ protocols, addProtocol }), [protocols]);

  return <ProtocolContext.Provider value={value}>{children}</ProtocolContext.Provider>;
}

export function useProtocol() {
  const context = useContext(ProtocolContext);

  if (!context) {
    throw new Error('useProtocol must be used within a ProtocolProvider');
  }

  return context;
}
