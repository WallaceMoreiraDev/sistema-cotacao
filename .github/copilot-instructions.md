# Copilot Instructions — Sistema Interno de Cotação e Vendas

## Contexto do projeto
Este projeto é um MVP front-end-only para um sistema interno de cotação e vendas de uma distribuidora de vedações.

## Restrições arquiteturais
- Usar Next.js com App Router.
- Manter a implementação como front-end only por enquanto.
- Persistir dados no localStorage, não em banco real.
- Simular autenticação por papel (`admin` e `funcionario`) via Context API.
- Simular a API do Bling com dados mockados e latência artificial.
- Evitar decisões arquiteturais fora deste escopo sem validação prévia.

## Regras de negócio prioritárias
- O fluxo principal é: visita → amostra → medidas → consulta Bling → cotar → melhor preço → pedir/separar → lançar pedido de venda → entrega.
- O sistema deve priorizar usabilidade para um operador com baixa confiança digital, então a experiência deve ser simples, guiada e à prova de erros.
- O auto-save deve ocorrer sempre que o usuário editar campos de um protocolo.
- Os itens podem ser categorizados como estoque ou a_cotar.
- O markup deve seguir os padrões A (70%) e B (30%), com aprovação por item para desvios.
- O sistema deve gerar PDFs para: lista de itens a cotar e proposta comercial.

## Diretrizes de implementação
- Preferir componentes pequenos e reutilizáveis.
- Manter os dados e a lógica de negócio em camadas separadas: hooks, services, utils e types.
- Usar TypeScript sempre que possível.
- Manter o código preparado para futura migração para Supabase e backend real.
- Não introduzir banco de dados real, autenticação real ou backend neste ciclo.

## Escopo atual
- Tela de login simulada.
- Dashboard com visão de funcionário.
- Tela de novo protocolo.
- Tela de edição de protocolo.
- Persistência local e mocks de Bling.

## Não fazer
- Não criar integração real com Supabase neste momento.
- Não implementar autenticação real por senha.
- Não adicionar backend ou API server actions sem validação.

# Fluxo de Trabalho (Sempre nesta ordem)
1. **Compreensão:** Analise o contexto existente e os arquivos abertos no workspace.
2. **Planejamento:** Antes de gerar o código, crie um plano de ação passo a passo.
3. **Implementação:** Execute as alterações necessárias nos arquivos corretos.
4. **Verificação:** Revise seu próprio trabalho, certifique-se de que não há erros de sintaxe ou dependências quebradas e rode testes se possível.

# Regras de Programação
- Siga os princípios SOLID e DRY.
- Adote o padrão de nomenclatura camelCase para variáveis e PascalCase para componentes.
- Nunca deixe *hardcoded* strings ou valores que possam ser variáveis de ambiente.
- Inclua comentários JSDoc/TSDoc para funções complexas e documente novas APIs.
- O código deve ser sempre responsivo e acessível.

# Restrições (O que NÃO fazer)
- Não crie código redundante ou bibliotecas desnecessárias.
- Não instale novos pacotes npm sem me perguntar antes.
- Não altere configurações de infraestrutura sem minha autorização explícita.
- Em caso de ambiguidade, pare e pergunte em vez de adivinhar.

# Formato de Resposta
Ao me responder, seja conciso. Forneça o racional do que foi feito, liste os arquivos modificados e, se aplicável, indique o comando para testar ou executar a nova funcionalidade.
