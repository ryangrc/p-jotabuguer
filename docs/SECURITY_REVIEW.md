# Revisao de seguranca

## Correcoes

- Identificadores de backups sao escapados nos atributos HTML de listas, botoes e seletores; o seletor CSS de produtos tambem escapa o identificador.
- Exportacoes CSV prefixam textos que poderiam ser interpretados como formulas. Valores numericos continuam numericos.
- O HTML tem uma Content Security Policy que permite apenas scripts locais, impede scripts inline, objetos, formularios externos e conexoes de rede. Estilos inline continuam permitidos para graficos e impressao. Ao integrar a API, ajuste connect-src para o HTTPS/WSS dela.
- A API exige segredo JWT de producao, restringe o algoritmo a HS256 e exige o esquema Bearer.
- Setup exige segredo separado e serializa a criacao inicial no PostgreSQL.
- Login e setup possuem limite por IP; respostas internas nao revelam mensagens do banco. Erros de validacao retornam 400.
- Eventos Socket.IO exigem autenticacao na conexao. Respostas HTTP da API nao devem ser armazenadas em cache.
- Dependencias possuem lockfile e arquivos .env sao ignorados pelo Git.

## Limites importantes

O site do GitHub Pages ainda usa localStorage e autenticacao local. Quem controla o navegador pode alterar usuarios, permissoes e dados. Os hashes locais atuais tambem nao oferecem a resistencia de um derivador de senhas como PBKDF2/Argon2. Estas correcoes nao transformam o site estatico em um sistema com autorizacao de servidor.

Para uso compartilhado, ainda e necessario hospedar a API/PostgreSQL e conectar as operacoes do frontend a ela, migrando os dados e substituindo o login local. Backups JSON continuam contendo dados operacionais e de clientes em texto legivel.

A autenticacao de Socket.IO ocorre apenas ao conectar. Revogacao de sessoes existentes, alteracao de senha e expiracao de tokens em conexoes persistentes precisam de uma politica adicional. O limite de login usa memoria local do processo e nao substitui controle distribuido em varias instancias.

## Validacao

`cd backend && npm test`: regressao de HTML com identificadores maliciosos, CSV, JWT, configuracao de producao, bloqueio de setup, respostas de erro, rotas HTTP protegidas e limite de login. Os testes nao usam um PostgreSQL real; o bloqueio concorrente do setup e o fluxo completo de pedidos precisam de teste de integracao em ambiente de homologacao. O conjunto nao constitui uma auditoria exaustiva.

Referencias de implementacao: [Socket.IO middleware](https://socket.io/docs/v4/middlewares/) e [express-rate-limit](https://express-rate-limit.mintlify.app/reference/configuration).
