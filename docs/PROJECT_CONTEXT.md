# Contexto do Projeto — MVP de Cotação e Vendas

## 1. Visão geral
Este projeto é um MVP front-end-only para um sistema interno de cotação e vendas de uma distribuidora de vedações.

## 2. Problema operacional
A operação atual depende muito de processos manuais e de papel. O operador Tiago mede peças, registra em prancheta e assina, o que gera lentidão, retrabalho e desperdício com viagens locais para buscar peças.

## 3. Objetivo do MVP
Criar um fluxo digital inicial para:
- registrar protocolos;
- adicionar itens;
- consultar dados mockados do Bling;
- calcular valores com markup;
- separar itens em estoque e a cotar;
- exportar PDFs de lista faltante e proposta comercial.

## 4. Perfis de usuário
- `admin`: pode aprovar itens com markup diferente dos padrões.
- `funcionario`: pode criar e editar protocolos, mas não aprova desvios de markup.

## 5. Regras de negócio principais
- Auto-save sempre que houver alteração em campos do protocolo.
- Consulta simultânea ao mock da API do Bling enquanto o usuário digita.
- Se a peça existir no mock, mostrar estoque e preço.
- Se não houver estoque, mostrar valor previsto de compra ou `--`.
- Cadastro automático de produtos novos no fluxo de protocolo.
- Markup padrão A: 70%.
- Markup padrão B: 30%.
- Desvios de markup devem ir para aprovação por item.

## 6. Fluxo de telas
1. Login simulado.
2. Dashboard com lista de protocolos e kanban.
3. Novo protocolo com formulário principal.
4. Edição de protocolo existente.

## 7. Persistência e estado
- Persistência local via localStorage.
- Context API para autenticação simulada.
- Estado de protocolos gerenciado localmente para o MVP.

## 8. Decisão estratégica atual
- Não implementar backend real ainda.
- Não integrar com Supabase real neste ciclo.
- Preparar a arquitetura para futura migração.
