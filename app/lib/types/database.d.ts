// ─── Stock Product (Bling API response shape) ───
export interface StockProduct {
  id: string;
  name: string;
  sku: string;
  code: string; // código da vedação
  stock: number;
  costPrice: number;
  category: string;
  measurements?: {
    innerDiameter?: number;
    outerDiameter?: number;
    height1?: number;
    height2?: number;
    thickness?: number;
    cs?: number;
  };
}

// ─── Supplier ───
export interface Supplier {
  id: string;
  name: string;
  type: 'original' | 'local';
  defaultMarkup: number;
}

// ─── Protocol Item (expanded) ───
export interface ProtocolItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  type: 'estoque' | 'a_cotar';
  status: 'pendente' | 'aprovado' | 'reprovado';
  oem?: string;
  nickname?: string;
  code?: string; // código da vedação
  measurements?: {
    innerDiameter?: number;
    outerDiameter?: number;
    height1?: number;
    height2?: number;
    thickness?: number;
    cs?: number;
  };
  // ── Supplier pricing (only for 'a_cotar' items) ──
  supplierPrices?: Record<string, number>; // { sippel: 12.50, vedpira: 15.00 }
  chosenSupplier?: string; // auto-selected cheapest
  chosenSupplierType?: 'original' | 'local';
  markupPercent?: number;
  salePrice?: number;
  needsApproval?: boolean; // true when markup differs from default
  // ── Stock reference ──
  stockQty?: number; // qty found in stock at time of addition
  costPrice?: number; // from stock
  productId?: string; // ID from stock products for synchronization
}

// ─── Protocol ───
export interface Protocol {
  id: string | number;
  clientName: string;
  clientCnpj?: string;
  isNewClient?: boolean;
  title?: string; // status/título do protocolo
  status: 'draft' | 'in_progress' | 'in_review' | 'approved' | 'rejected' | 'separating';
  createdAt: string;
  updatedAt: string;
  items?: ProtocolItem[];
  totals?: {
    subtotal: number;
    markup: number;
    total: number;
  };
  draftForm?: any; // To hold the unsubmitted item form state
}

// ─── Client ───
export interface Client {
  id: string | number;
  name: string;
  cnpj?: string;
  company?: string;
}

// ─── Seal Type ───
export interface SealType {
  id: string | number;
  name: string;
  category?: string;
}

// ─── User Session ───
export interface UserSession {
  id: string;
  name: string;
  role: 'compras' | 'vendas' | 'financeiro';
}
