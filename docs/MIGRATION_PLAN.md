# Plano de Migracao Para Cliente-Servidor

Este plano preserva o sistema atual em HTML, CSS e JavaScript puro enquanto o backend novo e introduzido aos poucos.

## Fase 1 - Base Profissional

Status: iniciada.

Entregue nesta fase:

- Pasta `backend/`.
- API Express.
- PostgreSQL via `pg`.
- Schema inicial em `backend/src/database/schema.sql`.
- Migrador simples `npm run db:migrate`.
- JWT.
- Hash de senha com bcrypt.
- Middleware de autenticacao e permissao.
- Rotas iniciais para usuarios, catalogo, estoque, compras, pedidos, vendas, mesas e dashboard.
- Socket.IO preparado para pedidos em tempo real.

## Fase 2 - Autenticacao No Frontend

Objetivo:

- Trocar login local em `localStorage` por chamadas para `/api/auth`.
- Guardar token JWT no frontend.
- Aplicar permissoes vindas do backend.
- Manter fallback local apenas durante a transicao, se necessario.

Arquivos esperados:

- `frontend` ou modulo `apiClient` no frontend atual.
- Funcoes `login`, `setupAdmin`, `getCurrentUser`, `logout`.

## Fase 3 - Migrar Pedidos E Mesas

Objetivo:

- Tela do iPhone passa a criar pedidos via API.
- Painel do computador recebe atualizacoes em tempo real via Socket.IO.
- Status dos pedidos passa a ser salvo no PostgreSQL.

Prioridade:

1. `GET /api/orders`
2. `POST /api/orders`
3. `POST /api/orders/:id/accept`
4. `PATCH /api/orders/:id/status`
5. `GET /api/tables`
6. `PATCH /api/tables/:id`

## Fase 4 - Migrar Estoque

Objetivo:

- Materias-primas, compras e ficha tecnica deixam de usar `localStorage`.
- Baixa de estoque passa a ser feita dentro de transacao no banco.
- Movimentacoes ficam auditaveis em `stock_movements`.

## Fase 5 - Migrar Vendas E Relatorios

Objetivo:

- Vendas passam para PostgreSQL.
- CMV real e lucro bruto ficam persistidos no banco.
- Dashboard passa a consultar API.
- CSV e backup devem ser gerados a partir do backend.

## Fase 6 - Comercializacao

Objetivo:

- Multi-loja, se necessario.
- Backup automatico.
- Impressao.
- WhatsApp.
- PIX.
- Fechamento de caixa.
- Tela de cozinha.
- Notificacoes sonoras.
- Relatorios avancados.

## Decisao Importante

Enquanto o sistema estiver em transicao, evite editar os mesmos dados nos dois lugares ao mesmo tempo.

Exemplo: quando pedidos forem migrados para API, os pedidos devem parar de ser salvos no `localStorage`, mesmo que estoque e produtos ainda continuem locais temporariamente.
