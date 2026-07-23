import type { Protocol, ProtocolItem } from '../types/database';

export type KanbanColumnKey =
  | 'estoque_nao_reservado'
  | 'aguardando_fornecedor'
  | 'aguardando_aprovacao'
  | 'em_separacao'
  | 'finalizados';

export interface KanbanItem extends ProtocolItem {
  protocolId: string | number;
  clientName: string;
  protocolStatus: Protocol['status'];
}

/**
 * Determines the Kanban column for a specific item given its parent protocol.
 */
export function getItemKanbanColumn(item: KanbanItem): KanbanColumnKey | null {
  // If the protocol is cancelled, it shouldn't appear in the Kanban at all
  if (item.protocolStatus === 'cancelado') {
    return null;
  }

  // If the protocol is finished, all its items go to "Finalizados"
  if (item.protocolStatus === 'finalizado') {
    return 'finalizados';
  }

  // Otherwise, evaluate by item state
  if (item.type === 'estoque') {
    if (item.status === 'reservado') {
      return 'em_separacao';
    }
    return 'estoque_nao_reservado';
  }

  if (item.type === 'a_cotar') {
    // Missing supplier cost
    if (!item.unitPrice || item.unitPrice <= 0) {
      return 'aguardando_fornecedor';
    }

    // Needs approval due to non-standard markup and NOT approved yet
    if (item.needsApproval && item.approvalStatus !== 'approved') {
      return 'aguardando_aprovacao';
    }
    
    // If it is 'a_cotar' and has price and standard (or approved) markup, it implies it is "ready".
    // It should go to Finalizados.
    return 'finalizados';
  }

  return null;
}

/**
 * Extracts and maps all items from a list of protocols into their respective Kanban columns.
 */
export function distributeItemsToKanban(protocols: Protocol[]): Record<KanbanColumnKey, KanbanItem[]> {
  const columns: Record<KanbanColumnKey, KanbanItem[]> = {
    estoque_nao_reservado: [],
    aguardando_fornecedor: [],
    aguardando_aprovacao: [],
    em_separacao: [],
    finalizados: [],
  };

  protocols.forEach((protocol) => {
    if (!protocol.items) return;

    protocol.items.forEach((item) => {
      const kanbanItem: KanbanItem = {
        ...item,
        protocolId: protocol.id,
        clientName: protocol.clientName,
        protocolStatus: protocol.status,
      };

      const columnKey = getItemKanbanColumn(kanbanItem);
      if (columnKey) {
        columns[columnKey].push(kanbanItem);
      }
    });
  });

  return columns;
}
