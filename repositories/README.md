Camada prevista para acesso a dados.

Hoje o acesso real continua local, via `storageRepository` em `app.js`. A regra para a migracao futura e manter todo armazenamento passando por uma camada unica antes de trocar `localStorage` por API/PostgreSQL.
