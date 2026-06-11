# Backend Pjotabuguer

API inicial para evoluir o sistema local da hamburgueria para arquitetura cliente-servidor.

## Stack

- Node.js
- Express
- PostgreSQL
- JWT
- bcryptjs
- Socket.IO para atualizacao em tempo real dos pedidos

## Como Rodar

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Ajuste `DATABASE_URL` no `.env`.

3. Instale as dependencias:

```bash
npm install
```

4. Crie/migre as tabelas:

```bash
npm run db:migrate
```

5. Inicie a API:

```bash
npm run dev
```

A API sobe por padrao em:

```text
http://localhost:3333
```

## Primeiros Endpoints

Autenticacao:

- `POST /api/auth/setup`: cria o primeiro administrador.
- `POST /api/auth/login`: retorna JWT.
- `GET /api/auth/me`: retorna usuario logado.

Usuarios:

- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`

Catalogo:

- `GET /api/catalog/products`
- `POST /api/catalog/products`
- `PATCH /api/catalog/products/:id`
- `DELETE /api/catalog/products/:id`
- `GET /api/catalog/categories`

Estoque:

- `GET /api/inventory/ingredients`
- `POST /api/inventory/ingredients`
- `PATCH /api/inventory/ingredients/:id`
- `DELETE /api/inventory/ingredients/:id`
- `GET /api/inventory/products/:productId/recipe`
- `PUT /api/inventory/products/:productId/recipe`
- `POST /api/inventory/purchases`

Pedidos:

- `GET /api/orders`
- `POST /api/orders`
- `POST /api/orders/:id/accept`
- `PATCH /api/orders/:id/status`

Mesas:

- `GET /api/tables`
- `POST /api/tables`
- `PATCH /api/tables/:id`
- `DELETE /api/tables/:id`

Vendas:

- `GET /api/sales`
- `POST /api/sales`

Dashboard:

- `GET /api/dashboard/summary`

## Tempo Real

O backend emite eventos Socket.IO:

- `order:created`
- `order:updated`

Esses eventos serao usados pelo painel no computador e pelo iPhone para sincronizar pedidos em tempo real.
