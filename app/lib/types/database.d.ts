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
  part_type?: string;
  parker_code?: string;
  oem_code?: string;
  blingId?: number;
  supplierId?: string;
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
  blingId?: number;
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
  oem_code?: string;
  code?: string; // código da vedação (SKU FM)
  brand?: string;
  part_type?: string;
  parker_code?: string;
  description?: string; // Nome inteligente gerado
  measurements?: {
    innerDiameter?: number;
    outerDiameter?: number;
    height1?: number;
    height2?: number;
    thickness?: number;
    cs?: number;
  };
  supplierId?: string; // Vínculo exclusivo
  markupPercent?: number;
  salePrice?: number;
  needsApproval?: boolean; // true when markup differs from default
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // State of the requested markup
  isMarkupDirty?: boolean; // true if the user locally edited the markup but hasn't saved/synced yet
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
  blingId?: number;
}

// ─── Seal Families (Category Groups) ───
export interface SealFamily {
  id: string | number;
  name: string;
  blingId?: number;
  createdAt?: string;
}

// ─── System Settings ───
export interface SystemSettings {
  markup_original: number;
  markup_local: number;
  bling_client_id?: string;
  bling_client_secret?: string;
  bling_access_token?: string;
  bling_refresh_token?: string;
  bling_token_expires_at?: string;
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
