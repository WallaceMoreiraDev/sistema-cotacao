import type { Protocol, ProtocolItem } from '../types/database';

export function createProtocol(initial: Partial<Protocol>): Protocol {
  return {
    id: `proto-${Date.now()}`,
    clientName: initial.clientName ?? 'Cliente',
    status: initial.status ?? 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: initial.items ?? [],
    totals: initial.totals ?? { subtotal: 0, markup: 0, total: 0 },
  } as Protocol;
}

export function addItemToProtocol(protocol: Protocol, item: ProtocolItem): Protocol {
  return {
    ...protocol,
    items: [...protocol.items, item],
  };
}

export function calculateTotals(items: ProtocolItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const markup = subtotal * 0.3;
  const total = subtotal + markup;

  return { subtotal, markup, total };
}
