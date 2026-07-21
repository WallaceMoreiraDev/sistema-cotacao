# Arquitetura — MVP de Cotação e Vendas

## 1. Objetivo
Documentar a estrutura de pastas do Next.js e o esboço das entidades de dados para sustentar o fluxo de protocolos e itens, com foco em integração com a API do Bling para criação de pedidos de venda.

## 2. Estrutura de pastas do Next.js

```text
app/
  (auth)/
    login/
      page.tsx
  (dashboard)/
    dashboard/
      page.tsx
    protocolo/
      [id]/
        page.tsx
      novo/
        page.tsx
    layout.tsx
  components/
    forms/
    kanban/
    layout/
    pdf/
    ui/
  context/
  hooks/
  lib/
    mocks/
    services/
    types/
  public/
  utils/
  favicon.ico
  globals.css
  layout.tsx
  page.tsx
```

## 3. Esboço de entidades de dados

### tabela: profiles
- id (uuid, pk)
- full_name
- role (admin | funcionario)
- created_at

### tabela: protocols
- id (uuid, pk)
- client_name
- status (draft | in_review | approved | separating | rejected)
- created_at
- updated_at
- created_by (uuid -> profiles.id)

### tabela: protocol_items
- id (uuid, pk)
- protocol_id (uuid -> protocols.id)
- item_name
- oem_code
- nickname
- quantity
- item_type (estoque | a_cotar)
- measurements (jsonb)
- markup_type (A | B)
- markup_value
- purchase_price
- local_market_price
- supplier_name
- sale_price
- approval_status (pending | approved | rejected)
- created_at
- updated_at

### tabela: approvals
- id (uuid, pk)
- protocol_item_id (uuid -> protocol_items.id)
- approved_by (uuid -> profiles.id)
- approved_at
- reason

## 4. Decisões de implementação atual
- Persistência local via localStorage.
- Dados mockados para Bling.
- Estado local para protocolos.
- Preparação para migração futura para Supabase.
