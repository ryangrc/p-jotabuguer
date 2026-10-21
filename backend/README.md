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

2. Ajuste `DATABASE_URL` no `.env`. Gere dois segredos independentes com `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` e configure `JWT_SECRET` e `SETUP_TOKEN`. Nunca coloque esses valores no frontend ou no Git.

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

- `POST /api/auth/setup`: cria o primeiro administrador; exige o cabecalho `X-Setup-Token` com o valor de `SETUP_TOKEN`. Sem essa variavel, o endpoint fica desabilitado. Remova `SETUP_TOKEN` depois de criar o administrador.
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

Conexoes Socket.IO exigem `auth: { token: jwtDeLogin }`. O token e o usuario ativo sao verificados na conexao. A revogacao de conexoes ja abertas e a invalidacao imediata de JWTs apos troca de senha ainda precisam ser implementadas antes de uma implantacao com esses requisitos.

## Seguranca e testes

Execute `npm ci`, `npm test` e `npm audit --omit=dev`. O limite de autenticacao e de 10 requisicoes por IP a cada 15 minutos, compartilhado entre login e setup, em memoria por processo. Para varias instancias, configure armazenamento compartilhado; atras de proxy, configure `trust proxy` conforme a infraestrutura, nunca aceitando indiscriminadamente cabecalhos enviados pelo cliente.

Em producao, a API recusa um JWT_SECRET ausente, curto ou com o texto dos exemplos. Em desenvolvimento, a ausencia gera um segredo temporario e reiniciar invalida os tokens. Use HTTPS e configure CORS_ORIGIN com as origens reais. A criacao inicial usa uma transacao e bloqueio da tabela users para serializar requisicoes concorrentes.
