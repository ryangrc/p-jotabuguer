# BurgerStock

Sistema simples para registrar compras e vendas de hamburgueres com controle de estoque.

## Como usar

Abra o arquivo `index.html` no navegador.

Os dados ficam salvos no proprio navegador usando `localStorage`. Para testar rapidamente, clique em **Carregar exemplo** dentro do sistema.

## Funcionalidades

- Cadastro de ingredientes com unidade, estoque inicial e estoque minimo.
- Edicao de materias-primas ja cadastradas, evitando duplicidade de nomes no estoque.
- Reposicao de materia-prima pela tela de ingrediente, informando quantidade comprada e valor pago para atualizar investimento e CMV.
- Exclusao de materias-primas, removendo o item das fichas tecnicas vinculadas.
- Registro de compras, somando automaticamente ao estoque.
- Cadastro de hamburgueres com preco de venda e ficha tecnica de estoque.
- Exclusao de produtos do cardapio sem apagar vendas antigas do historico.
- Inclusao de varias materias-primas no mesmo produto, com quantidade usada por unidade vendida.
- Aba de investimento com custo medio, valor investido por materia-prima, CMV e lucro medio por produto.
- Registro de vendas, baixando automaticamente todos os ingredientes da ficha tecnica.
- Edicao do historico de vendas, devolvendo o estoque antigo e aplicando a baixa corrigida.
- Bloqueio de venda quando o estoque nao cobre a receita.
- Painel com faturamento, gastos, lucro estimado e alertas de estoque baixo.

## Arquivos

- `index.html`: estrutura da tela.
- `styles.css`: visual responsivo.
- `app.js`: regras de estoque, compras, vendas e persistencia local.
