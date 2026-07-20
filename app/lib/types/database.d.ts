export interface ProtocolItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  type: 'estoque' | 'a_cotar';
  status: 'pendente' | 'aprovado' | 'reprovado';
  oemCode?: string;
  nickname?: string;
  measurements?: Record<string, string>;
}

export interface Protocol {
  id: string;
  clientName: string;
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  items: ProtocolItem[];
  totals: {
    subtotal: number;
    markup: number;
    total: number;
  };
}

export interface Client {
  id: string;
  name: string;
  company: string;
}

export interface UserSession {
  id: string;
  name: string;
  role: 'compras' | 'vendas' | 'financeiro';
}
