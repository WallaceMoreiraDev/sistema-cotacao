import type { Protocol, ProtocolItem } from '../types/database';

export function createProtocol(initial: Partial<Protocol>): Protocol {
  return {
    id: initial.id ?? `proto-${Date.now()}`,
    clientName: initial.clientName ?? 'Cliente',
    title: initial.title ?? '',
    status: initial.status ?? 'draft',
    createdAt: initial.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: initial.items ?? [],
    totals: initial.totals ?? { subtotal: 0, markup: 0, total: 0 },
  } as Protocol;
}

export function addItemToProtocol(protocol: Protocol, item: ProtocolItem): Protocol {
  return {
    ...protocol,
    items: [...(protocol.items || []), item],
  };
}

/**
 * Calculates totals considering the new item structure.
 * - Items with salePrice use that directly.
 * - Items in stock use costPrice * (1 + markup/100).
 * - Items without pricing contribute R$ 0.
 */
export function calculateTotals(items: ProtocolItem[]) {
  let totalEstoque = 0;
  let totalACotar = 0;

  for (const item of items) {
    const sale = (item.salePrice ?? 0) * item.quantity;
    
    if (item.type === 'estoque') {
      totalEstoque += sale;
    } else {
      // a_cotar
      totalACotar += sale;
    }
  }

  const subtotal = totalEstoque + totalACotar;
  const total = subtotal; // markup already baked into each item's salePrice

  return { subtotal, markup: 0, total, totalEstoque, totalACotar };
}
