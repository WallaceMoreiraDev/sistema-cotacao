# Contexto do Projeto e Arquitetura — MVP de Cotação e Vendas

## 1. Visão geral
Este projeto é um **MVP full-stack** para um sistema interno de cotação e vendas de uma distribuidora de vedações (**Força Máxima Vedações**). A aplicação utiliza Next.js (App Router), Supabase (PostgreSQL) como banco de dados e autenticação, e integração com a API real do ERP Bling.

### 1.1 Identidade Visual & Branding
- **Nome Oficial**: **Força Máxima Vedações**
- **Cor Destaque (Accent)**: `#F7C00C` (Amarelo Ouro).
- **Cores Neutras**: Escuros corporativos (Slate `slate-900` / `slate-950`), Branco e Cinza claro.
- **Uso de Cores**: O amarelo `#F7C00C` é a cor primária de destaque da marca e deve ser usado para CTAs, badges de destaque e acentos visuais estratégicos.

## 2. Problema operacional
A operação atual depende de processos manuais (papel, prancheta) e da desorganização nas compras locais. A digitalização visa eliminar retrabalho, reduzir erros e agilizar o fluxo de vendas.

## 3. Objetivo do MVP
Digitalizar e otimizar o fluxo de cotação e vendas, permitindo:
- registrar protocolos com auto-save em banco;
- adicionar itens com medidas condicionais;
- consultar a API do Bling em tempo real;
- calcular automaticamente o preço de venda com markup;
- separar itens inteligente e concorrentemente em estoque e a cotar;
- gerar PDF da lista de itens faltantes (para fornecedores);
- enviar os dados do protocolo para o Bling via API (pedido de venda).

## 4. Perfis de usuário e Autenticação
- `admin`: pode aprovar itens com markup diferente dos padrões e possui acesso irrestrito no banco de dados via RLS.
- `funcionario`: pode criar e editar protocolos, restrito pelo RLS a acessar apenas seus próprios registros. Não aprova desvios de markup.
- **Autenticação**: Supabase Auth (SSR com verificação por cookies).

## 5. Regras de negócio principais
- **Auto-save**: toda alteração em campos do protocolo é persistida instantaneamente no PostgreSQL via Server Actions.
- **Consulta simultânea à API Bling**: pesquisa de itens no Bling.
- **Cadastro automático**: ao adicionar um item novo, o sistema cadastra o produto no Bling automaticamente.
- **Markup**:
  - Padrão A: 70% (atacadista originais).
  - Padrão B: 30% (mercado local).
- **Aprovação por item**: desvios de markup vão para aprovação; vinculada a cada item (`protocol_items`).

## 6. Arquitetura do Frontend e Gerenciamento de Estado
- **Framework**: Next.js 14 (App Router) usando TypeScript e Tailwind CSS.
- **Gerenciamento de Estado (Padrão Maestro)**: Não utilizamos Redux, Zustand ou Context API (exceto para sessões se necessário). Toda a complexidade de estado e cálculos fica abstraída em **Custom Hooks** (ex: `useProtocolState.ts`, `useProtocolRealtime.ts`) que gerenciam a regra de negócio e estado local, e em seguida injetam as ações e os dados em componentes de interface burros e isolados via **Prop-drilling**.
- **Supabase Realtime**: Utilizamos `supabase.channel` nativamente no cliente para refletir alterações de outros usuários instantaneamente (ex: estoques liberados em `protocol_items`), evitando polling (fetching em loop).

## 7. Estrutura de Pastas (Next.js)
```text
app/
  (auth)/          # Rotas de Autenticação (login)
  (dashboard)/     # Rotas Protegidas do Sistema
    dashboard/
    protocolo/
      [id]/
      novo/
      components/  # UI Components fatiados (Maestro pattern)
  api/
  lib/
    actions/       # Server Actions seguras (SSR)
    config/        # Constantes e Formatos (ex: schemas, suppliers)
    hooks/         # Custom Hooks p/ Abstração de Estado
    services/      # Conexões DB / Regras Puras Back-End
    supabase/      # SSR Auth Clients
    types/         # Tipagens (Database TypeScript)
    utils/         # Funções Utilitárias Puras e Formatações
```

## 8. Estrutura de Dados (PostgreSQL / Supabase)
- **`users`**: id, email, senha_hash, role, nome.
- **`protocols`**: id, client_name, client_cnpj, is_new_client, title, status, subtotal, markup, total.
- **`seal_types`**: id, name, created_at.
- **`clients`**: id, name, cnpj.
- **`protocol_items`**: id, protocol_id, name, type, quantity, code, oem, nickname, measurements (JSONB), chosen_supplier, supplier_prices, markup_percent, cost_price, unit_price, sale_price, needs_approval.