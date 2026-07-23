// ─── Stock Allocation Holder ───
export interface StockHolder {
  protocolId: number;
  clientName: string;
  title?: string;
  quantity: number;
}

// ─── Stock Product (Bling API response shape) ───
export interface StockProduct {
  id: string;
  name: string;
  sku: string;
  code: string; // código da vedação
  stock: number;
  costPrice: number;
  category: string;
  brand?: string;
  heldBy?: StockHolder[];
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
  id: string | number;
  name: string;
  type: 'Mercado Local' | 'Fornecedor Original';
  createdAt?: string;
}

// ─── Protocol Item (expanded) ───
export interface ProtocolItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  type: 'estoque' | 'a_cotar';
  status: 'pendente' | 'aprovado' | 'reprovado' | 'reservado';
  oem?: string;
  nickname?: string;
  code?: string; // código da vedação
  brand?: string;
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
  chosenSupplierType?: 'Mercado Local' | 'Fornecedor Original';
  markupPercent?: number;
  salePrice?: number;
  needsApproval?: boolean; // true when markup differs from default
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // State of the requested markup
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
  status: 'nao_reservado' | 'reservado' | 'finalizado' | 'cancelado';
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

// ─── Seal Families (Category Groups) ───
export interface SealFamily {
  id: string | number;
  name: string;
  createdAt?: string;
}

// ─── Seal Types (Specific) ───
export interface SealType {
  id: string | number;
  name: string;
  family_id: string | number;
  family?: SealFamily; // relationship
  requiredMeasurements?: string[];
}

// ─── System Settings ───
export interface SystemSettings {
  markup_original: number;
  markup_local: number;
}

// ─── User Profile (Fase 2) ───
export interface Profile {
  id: string; // UUID from auth.users
  full_name: string;
  role: 'admin' | 'funcionario';
  job_title: string;
  department: string;
  status: 'ativo' | 'inativo';
  needs_password_change: boolean;
  created_at?: string;
  updated_at?: string;
}
