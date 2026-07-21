# Contexto do Projeto — MVP de Cotação e Vendas (Full-Stack)

## 1. Visão geral
Este projeto é um **MVP full‑stack** para um sistema interno de cotação e vendas de uma distribuidora de vedações (**Força Máxima Vedações**). A aplicação utiliza Next.js (App Router), Supabase (PostgreSQL) como banco de dados e autenticação, e integração com a API real do ERP Bling.

### 1.1 Identidade Visual & Branding
- **Nome Oficial**: **Força Máxima Vedações**
- **Cor Destaque (Accent)**: `#F7C00C` (Amarelo Ouro).
- **Cores Neutras**: Escuros corporativos (Slate `slate-900` / `slate-950`), Branco e Cinza claro.
- **Uso de Cores**: O amarelo `#F7C00C` é a cor primária de destaque da marca e deve ser usado para CTAs, badges de destaque e acentos visuais estratégicos.

## 2. Problema operacional
A operação atual depende de processos manuais (papel, prancheta) e da desorganização nas compras locais. O operador Tiago mede peças, anota dados manualmente e enfrenta atrasos na cotação e separação. A digitalização visa eliminar retrabalho, reduzir erros e agilizar o fluxo de vendas.

## 3. Objetivo do MVP
Digitalizar e otimizar o fluxo de cotação e vendas, permitindo:
- registrar protocolos com auto‑save;
- adicionar itens com medidas condicionais;
- consultar a API do Bling em tempo real;
- calcular automaticamente o preço de venda com markup;
- separar itens em estoque e a cotar;
- gerar PDF da lista de itens faltantes (para fornecedores);
- enviar os dados do protocolo para o Bling via API, criando um pedido de venda automaticamente.

## 4. Perfis de usuário
- `admin`: pode aprovar itens com markup diferente dos padrões.
- `funcionario`: pode criar e editar protocolos, mas não aprova desvios de markup.

## 5. Regras de negócio principais
- **Auto‑save**: toda alteração em campos do protocolo é persistida instantaneamente no banco de dados via Server Actions.
- **Consulta simultânea à API Bling**: enquanto o usuário digita os dados da peça, o sistema consulta a API do Bling. Se a peça existir, exibe estoque e preço; senão, utiliza o preço médio previsto armazenado na tabela `products`.
- **Cadastro automático**: ao adicionar um item novo (não existente no Bling), o sistema cadastra o produto automaticamente via API e salva o `idBling` no banco.
- **Markup**:
  - Padrão A: 70% (atacadista, ex: Sippel).
  - Padrão B: 30% (mercado local).
- **Aprovação por item**: desvios de markup vão para aprovação; apenas administradores podem aprovar, e a aprovação é vinculada a cada item (`protocol_items`).
- **Exportação/Integração**:
  1. Registro interno no banco.
  2. PDF com apenas os itens faltantes (Nome, Tipo, Medida, Quantidade) para envio a fornecedores.
  3. Envio dos dados do protocolo para o Bling via API, criando um pedido de venda com as informações já calculadas (preços, quantidades, cliente).

## 6. Fluxo de telas
1. Login (Supabase Auth – email/senha).
2. Dashboard com lista de protocolos (ordenada por data de edição) e Kanban (Em andamento, Aguardando fornecedor, Aguardando aprovação, Finalizados).
3. Novo protocolo (formulário principal com cabeçalho – nome do cliente e CNPJ –, adição de itens condicional, painel de resultados do Bling, lista de itens dividida em Estoque/A Cotar, e rodapé com totais e botões de exportação: PDF da lista faltante e "Enviar para Bling").
4. Edição de protocolo existente (mesma estrutura do novo protocolo, mas com dados carregados).

## 7. Decisões arquiteturais
- **Full‑stack com Next.js (App Router)** – Server Components e Server Actions para lógica de negócio, acesso ao banco e integrações externas.
- **Banco de dados e autenticação**: Supabase (PostgreSQL) com RLS habilitado. Utilizar `@supabase/ssr` para gerenciar sessões via cookies.
- **Integração com Bling**: todas as chamadas à API real do Bling (consulta de produtos, cadastro, criação de pedido de venda) serão feitas exclusivamente em Server Actions, protegendo as credenciais.
- **Geração de PDF**: utilizando `@react-pdf/renderer` no servidor (via Server Action) apenas para a lista de itens a cotar.
- **Persistência**: dados armazenados no PostgreSQL, com políticas de segurança por papel (`admin`/`funcionario`).
- **Preparação para produção**: o código deve ser seguro, testável e seguir as boas práticas do Next.js e Supabase.

## 8. Estrutura de dados (resumida)
- `users`: id, email, senha_hash, role, nome.
- `protocols`: id, client_name, client_document, user_id, status, total_compra, total_venda, data_edicao, observacao.
- `products`: id, id_bling, nome, tipo_peca, medidas_padrao (JSONB), estoque_atual, preco_medio_previsto.
- `protocol_items`: id, protocol_id, product_id, tipo_peca, cod_oem, apelido, quantidade, medidas (JSONB), markup_tipo, markup_percentual, preco_venda, preco_compra_estimado, status_item (estoque/cotar), fornecedor_selecionado, preco_fornecedor, preco_mercado_local, aprovacao_status, aprovado_por, data_aprovacao.

## 9. Tecnologias e dependências principais
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- React Hook Form + Zod
- @react-pdf/renderer
- UUID