# Git Commits
Always commit and save your changes to Github in a professional manner following good practices after completing significant tasks or addressing user requests. Use clear and descriptive commit messages.

## Best Practices
1. Commit logical chunks of work.
2. Use descriptive commit messages.
3. Push to remote automatically when necessary.

# TypeScript Compilation Checks
Always run `npx tsc --noEmit` to verify if there are any TypeScript compilation errors before finishing a task and delivering the code to the user. This ensures that the codebase remains healthy and free of broken types or undefined property accesses.

# Copilot Instructions — Sistema Interno de Cotação e Vendas

## Contexto do Projeto
Este projeto é um **MVP full-stack** para um sistema interno de cotação e vendas de uma distribuidora de vedações. Construído com Next.js (App Router), utiliza Server Components e Server Actions para lógica de negócio, integrado ao Supabase (PostgreSQL) e à API real do ERP Bling.

## Identidade Visual e Branding
- **Nome Oficial**: **Força Máxima Vedações**
- **Cor Primária**: `#F7C00C` (Amarelo Ouro / Amarelo Industrial).
- **Cores Neutras Base**: Escuros corporativos (Slate: `slate-950`, `slate-900`, `slate-800`), Branco (`#FFFFFF`) e Cinza (`slate-100` / `slate-50`).
- **Diretriz de Design**: O tom de amarelo `#F7C00C` deve ser usado estritamente para destaques estratégicos. Não poluir a interface com fundo amarelo total.

## Padrões de Arquitetura e Gerenciamento de Estado
1. **Regra Antifragilidade (God Objects)**: O sistema utiliza o padrão "Maestro". Arquivos de páginas e componentes não devem ultrapassar limites absurdos de linhas (idealmente manter abaixo de 200-300 linhas). Toda lógica complexa, cálculos e `useEffects` pesados devem ser estritamente abstraídos em **Custom Hooks** (`app/lib/hooks/`) e **Funções Puras** (`app/lib/utils/`). Componentes visuais devem ser os mais "burros" possíveis.
2. **Gerenciamento de Estado Local**: Não utilizamos bibliotecas pesadas de estado global (Zustand, Redux). A arquitetura atual prevê estado centralizado no arquivo Maestro da página, através de Custom Hooks dedicados, e injeção de estado e callbacks via **Prop-Drilling** para os componentes filhos fatiados.
3. **Regra do Supabase Realtime**: Para controle de concorrência e sincronização de estoque, utilizamos estritamente o recurso **`supabase.channel`** nativo. O sistema deve ouvir ativamente eventos `postgres_changes` em tabelas correspondentes (ex: `protocol_items`), processando a reatividade instantânea no cliente. É totalmente proibido o uso de chamadas de *polling* ineficiente com `setInterval`.

## Regras de Segurança Estrita (RLS e Autenticação)
- **Supabase SSR**: Utilizamos o `@supabase/ssr` via cookies.
- **Segurança Absoluta no Client e Server**: É **TERMINANTEMENTE PROIBIDO** utilizar a `service_role_key` em componentes client-side, hooks ou Server Actions de uso padrão.
- **Row Level Security (RLS)**: Toda e qualquer mutação ou consulta ao banco feita através de Server Actions ou cliente deve operar utilizando a sessão do usuário autenticado atual, respeitando as políticas de RLS configuradas no banco. Não tente contornar o RLS.

## Diretrizes de Comunicação e Ação do Assistente
- **Compreensão:** Analise o contexto existente, a abstração Maestro, as regras do Supabase e as funções em `/lib`.
- **Planejamento:** Para features que modifiquem a arquitetura, apresente sempre o plano, detalhando como o componente será quebrado e quais hooks serão criados.
- **Ação:** Execute comandos e modifique arquivos autonomamente via ferramentas. Evite pedir para o usuário fazer o trabalho mecânico.
- **Mudanças Externas:** Se alterações externas (como migrações em banco de dados Supabase, configurações em portais externos ou chaves de API) forem necessárias e a IA não for capaz de executá-las diretamente, ela deve especificar claramente os passos e comandos necessários para o usuário executar (ex: disponibilizar o script SQL de ALTER TABLE exato).
- **Código:**
  - Aplique SOLID e DRY. Separe lógicas visuais e de negócio.
  - Utilize Zod nas Server Actions.
  - Retorne `{ success: boolean; message: string; data?: T }` de Server Actions.
  - Siga nomenclatura `camelCase` para funções e variáveis, `PascalCase` para componentes.
