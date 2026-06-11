# BurgerStock

Sistema simples para registrar compras e vendas de hamburgueres com controle de estoque.

## Como usar

Abra o arquivo `index.html` no navegador.

Os dados ficam salvos no proprio navegador usando `localStorage`. Para testar rapidamente, clique em **Carregar exemplo** dentro do sistema.

No primeiro acesso, o sistema pede a criacao de um administrador com nome, email e senha alfanumerica. Depois disso, o acesso passa a ser feito por login e senha.

## Funcionalidades

- Cadastro de ingredientes com unidade, estoque inicial e estoque minimo.
- Login por email e senha, com primeiro usuario administrador.
- Cadastro, edicao e exclusao de usuarios pelo administrador.
- Perfil administrador com acesso total e perfil operador para uso diario de vendas/cardapio.
- Edicao de materias-primas ja cadastradas, evitando duplicidade de nomes no estoque.
- Reposicao de materia-prima por botao proprio na tela de ingrediente, informando quantidade comprada e valor pago para atualizar investimento e CMV sem duplicar compras ao editar.
- Exclusao de materias-primas, removendo o item das fichas tecnicas vinculadas.
- Registro de compras, somando automaticamente ao estoque.
- Edicao e exclusao de compras antigas com correcao do impacto no estoque.
- Cadastro de hamburgueres com preco de venda e ficha tecnica de estoque.
- Edicao completa de hamburgueres, incluindo nome, preco e ficha tecnica.
- Preenchimento rapido da ficha tecnica com busca de materia-prima, quantidade direta e unidade visivel.
- Campos de cardapio digital no produto, com nome publico, categoria, descricao, foto, destaque e status ativo.
- Aba Cardapio para criar pedidos a partir dos produtos ativos, com cliente, telefone, WhatsApp, endereco/mesa, destino, forma de pagamento, taxa, desconto, acrescimo e observacoes.
- Caixa de pedido rapido com lista compacta de produtos disponiveis, selecao de varios itens em um unico pedido e resumo financeiro.
- Esteira visual de pedidos do cardapio em colunas: aguardando aceite, em producao, pronto, saindo para entrega/mesa e pagamento confirmado.
- Tela de cozinha simples com pedidos aguardando aceite, em producao e prontos.
- Fechamento de caixa diario com totais por forma de pagamento, taxa, desconto, acrescimo, ticket medio e lucro bruto estimado.
- Historico de movimentacao de estoque para compras e vendas.
- Alerta sonoro opcional para novo pedido.
- Aceite de pedido do cardapio gerando venda automatica, baixando estoque e salvando CMV/lucro.
- Modo de impressao termica para comanda de pedido, com impressao automatica ao criar pedido e botao para reimprimir.
- Menu principal reorganizado por fluxo operacional: Dashboard, Pedidos, Cardapio, Produtos, Estoque, Financeiro, Relatorios, Usuarios e Configuracoes.
- Central de estoque agrupando ingredientes, compras e movimentacoes fisicas em subsecoes internas.
- Central financeira com faturamento, compras, CMV, lucro bruto, ticket medio, valor investido em estoque, entradas, saidas, movimentacoes financeiras e conferencia manual de caixa.
- Cadastro, edicao e exclusao de despesas operacionais para calcular lucro real.
- Historico financeiro em timeline com entradas, compras, despesas e ajustes.
- Conferencia final antes de confirmar pedido, reduzindo erros de atendimento.
- Alertas de estoque em niveis normal, atencao e critico, com lista de compra sugerida.
- Relatorios operacionais com graficos simples de produtos vendidos, ingredientes consumidos, lucro por produto e faturamento.
- Aviso de backup inteligente quando o ultimo backup tiver mais de 3 dias ou nunca tiver sido gerado.
- Area de configuracoes para carregar exemplos, exportar/importar backup e limpar dados.
- Exclusao de produtos do cardapio sem apagar vendas antigas do historico.
- Inclusao de varias materias-primas no mesmo produto, com quantidade usada por unidade vendida.
- Aba de investimento com custo medio, valor investido por materia-prima, CMV e lucro medio por produto.
- Registro de vendas, baixando automaticamente todos os ingredientes da ficha tecnica.
- Edicao do historico de vendas, devolvendo o estoque antigo e aplicando a baixa corrigida.
- Bloqueio de venda quando o estoque nao cobre a receita.
- Painel financeiro com faturamento, compras, CMV vendido, lucro bruto, estoque investido e lista de compra sugerida.
- Backup/restauracao em JSON e exportacao de relatorios CSV.
- Relatorio por periodo com filtros de hoje, semana, mes e intervalo personalizado.

## Arquivos

- `index.html`: estrutura da tela.
- `styles.css`: visual responsivo.
- `app.js`: regras de estoque, compras, vendas e persistencia local.
- `backend/`: inicio da API profissional com Express, PostgreSQL, JWT e Socket.IO.
- `docs/MIGRATION_PLAN.md`: plano gradual para migrar do `localStorage` para cliente-servidor.
