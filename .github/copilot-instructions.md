# Copilot Instructions — Sistema Interno de Cotação e Vendas

## Contexto do Projeto
Este projeto é um **MVP full-stack** para um sistema interno de cotação e vendas de uma distribuidora de vedações. Construído com Next.js (App Router), utiliza Server Components e Server Actions para lógica de negócio, integrado ao Supabase (PostgreSQL) e à API real do ERP Bling.

## Identidade Visual e Branding
- **Nome Oficial da Empresa**: **Força Máxima Vedações**
- **Cor Primária (Brand Accent)**: `#F7C00C` (Amarelo Ouro / Amarelo Industrial).
- **Cores Neutras Base**: Escuros corporativos (Slate: `slate-950`, `slate-900`, `slate-800`), Branco (`#FFFFFF`) e Cinza (`slate-100` / `slate-50`).
- **Diretriz de Design**: O tom de amarelo `#F7C00C` (`bg-brand`, `text-brand`, `border-brand`) deve ser usado estritamente para destaques estratégicos, botões CTA principais, badges ativas, indicadores e detalhes visuais importantes. Não poluir a interface com fundo amarelo total.

## Stack Tecnológica e Arquitetura
- **Front-end/Back-end**: Next.js 14 (App Router) com React Server Components (RSC) e Server Actions.
- **Estilização**: Tailwind CSS.
- **Banco de Dados e Autenticação**: Supabase (PostgreSQL). Utilizar `@supabase/ssr` para gerenciar sessões via cookies.
- **Integração Externa**: API do ERP Bling. Todas as chamadas devem ser feitas exclusivamente em Server Actions para proteger as credenciais.

### Padrão Arquitetural (Camadas)
Seguimos uma arquitetura em camadas dentro do ecossistema Next.js:

1. **Camada de Apresentação (UI)**: Componentes React em `app/` e `components/`.
2. **Camada de Ação (Server Actions)**: Arquivos em `lib/actions/`. Responsáveis por orquestrar regras de negócio, validar dados (Zod), e chamar serviços externos. Nunca exponha lógica de banco ou chaves de API diretamente nos componentes.
3. **Camada de Serviços (DB e APIs)**:
   - `lib/db/`: Clientes Supabase (server e browser) e consultas parametrizadas.
   - `lib/bling/`: Cliente dedicado para a API do Bling (tratamento de rate-limit, retry e mapeamento de respostas).
4. **Camada de Tipos (Types)**: Arquivos em `lib/types/`, compartilhados entre cliente e servidor. Os tipos do banco devem ser gerados automaticamente via `supabase gen types`.
5. **Camada de Utilitários**: `lib/utils/` para formatação, validação (Zod schemas) e constantes.

### Estrutura de Pastas (Diretrizes)
- `app/`: Rotas e layouts (grupos `(auth)` e `(dashboard)`).
- `app/api/`: (Opcional) reservado para webhooks, mas priorizar Server Actions para todas as mutações e consultas de negócio.
- `components/`: Componentes React reutilizáveis (UI, Forms, Kanban, PDF Templates).
- `lib/actions/`: Server Actions (ex: `protocolActions.ts`, `authActions.ts`, `blingActions.ts`).
- `lib/db/`: Configuração do Supabase (clientes) e queries SQL/ORM.
- `lib/bling/`: Funções dedicadas para chamar a API do Bling.
- `lib/types/`: Definições TypeScript (incluindo as geradas pelo Supabase).
- `lib/utils/`: Funções utilitárias (formatação, validação, constantes).
- `middleware.ts`: Controle de rota, autenticação e redirecionamento baseado em sessão.

## Diretrizes de Comunicação e Ação
- **Execute comandos no terminal sempre que possível** (instalação de pacotes, `npm run dev`, migrações, etc.). Não peça para o usuário rodar comandos manualmente, a menos que seja uma ação externa (ex: criar tabela no Supabase Dashboard).
- **Seja conciso e direto.** Não dê explicações prolongadas sobre conceitos básicos. Forneça apenas:
  - Lista de passos necessários (se houver ação externa).
  - Comandos exatos (se não puder executar).
  - Arquivos criados/modificados e suas funções resumidas.
- **Não liste passos de instalação ou configuração que você mesmo pode executar.** Apenas aja.
- **Se algo precisar ser feito fora da IDE (ex: criar tabela no Supabase, gerar chave de API), indique de forma clara e sucinta o que o usuário precisa fazer, sem tutorial extenso.**

## Regras de Negócio e Funcionalidades Core
- **Auto-save**: O sistema deve salvar no banco de dados (via Server Action) assim que o usuário interage com os campos, garantindo resiliência contra quedas de rede/navegador.
- **Consulta Simultânea (API Bling)**: Enquanto o usuário digita os dados da peça, o sistema dispara uma Server Action para consultar o Bling. Se encontrar, exibe estoque e preço; se não, utiliza o preço médio previsto armazenado na tabela `products`.
- **Cadastro Automático**: Ao adicionar um item novo que não existe no Bling, o sistema deve cadastrá-lo automaticamente via API do Bling e salvar o `idBling` no banco de dados.
- **Markup (Crucial)**:
  - Padrão A: 70% (Atacadista, ex: Sippel).
  - Padrão B: 30% (Mercado Local).
- **Aprovação por Item**: Apenas administradores podem aprovar markups fora do padrão. A aprovação é vinculada ao item específico (`protocol_items`), não ao cabeçalho do protocolo.
- **Integração com Bling para Pedido de Venda**: Ao finalizar o protocolo, o sistema deve enviar os dados necessários (itens, quantidades, preços, cliente) para a API do Bling, criando um pedido de venda automaticamente. Isso substitui a geração de proposta comercial em PDF.
- **Geração de PDF**: Apenas para a lista de itens a cotar (faltantes) – com Nome, Tipo, Medida, Quantidade – para envio a fornecedores.

## Banco de Dados (Supabase/PostgreSQL)
- Utilizar **UUID** como chave primária padrão.
- Habilitar **Row Level Security (RLS)** em todas as tabelas.
- **Políticas de Segurança**: Usuários (funcionários) só podem ver/alterar seus próprios protocolos; Administradores têm acesso total. Itens herdam a política do protocolo pai.
- `protocol_items` deve conter campos específicos para aprovação: `aprovacao_status`, `aprovado_por`, `data_aprovacao`.
- Utilizar **JSONB** para o campo `medidas`, a fim de suportar dinamicamente diferentes tipos de peças (Gaxeta, O-ring, etc.) sem alterar o schema.
- Gerar tipos automaticamente com o comando: `supabase gen types typescript --local > lib/types/database.ts`.

## Autenticação e Middleware
- Utilizar **Supabase Auth** com fluxo de Email/Senha.
- O middleware (`middleware.ts`) deve proteger todas as rotas do grupo `(dashboard)`, verificando a sessão via cookies.
- O papel do usuário (`role` como `admin` ou `funcionario`) deve estar armazenado na tabela `users` para autorização nas Server Actions.

## Fluxo de Trabalho do Assistente (Sempre nesta ordem)
1. **Compreensão:** Analise o contexto existente, os arquivos abertos no workspace e as regras de negócio aplicáveis.
2. **Planejamento:** Antes de gerar o código, crie um plano de ação passo a passo (ex: "Vou criar a Server Action X, alterar a tabela Y no Supabase via migração e atualizar o componente Z").
3. **Implementação:** Execute as alterações necessárias nos arquivos corretos. Priorize a segurança (nunca exponha `service_role` ou chaves de API no cliente).
4. **Verificação:** Revise seu próprio trabalho: verifique importações, consistência de tipos com o schema do Supabase, e se as regras de RLS não serão violadas.

## Regras de Codificação (Boas Práticas)
- **SOLID e DRY**: Separe a lógica de UI da lógica de negócio. Reutilize serviços e utilitários.
- **Nomenclatura**: `camelCase` para variáveis/funções, `PascalCase` para componentes/classes.
- **Validação**: Use **Zod** para validar entradas em todas as Server Actions. Nunca confie em dados do cliente sem validação.
- **Tratamento de Erros**: Server Actions devem retornar objetos padronizados:
  ```typescript
  { success: boolean; message: string; data?: T }