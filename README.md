# PJ Burguer — versão compartilhada

Aplicação operacional com interface preservada, API na Vercel e PostgreSQL Neon. A fonte oficial dos dados é o servidor. O login local antigo foi removido.

## Estrutura

- `cloud/app.js`: rotas HTTP, controle de acesso e transações.
- `cloud/security.js`: sessões revogáveis, bcrypt, CSRF e limite de tentativas.
- `cloud/domain.js`: pedidos, preços oficiais, consumo de ingredientes, vendas e entregas.
- `cloud/history.js`: histórico incremental para recuperação sem duplicar todo o banco a cada pedido.
- `cloud/schema.sql`: tabelas PostgreSQL; nomes com prefixo `cloud_` não conflitam com o backend anterior.
- `services/cloud-client.js`: sincronização, confirmação de gravação, rascunho de recuperação e acesso remoto.
- `app.js`, `index.html`, `styles.css`: módulos e aparência do sistema existente.
- `api/index.js`: entrada serverless da Vercel.
- `scripts/build.js`: publica somente arquivos permitidos, sem fontes do servidor ou credenciais.
- `tests/`: testes de domínio e integração com PostgreSQL real.

O backend antigo continua intacto no projeto original. Ele não é iniciado nem publicado por esta versão.

## Funcionamento em vários dispositivos

Use o mesmo endereço e as contas criadas pelo administrador. A tela consulta alterações a cada cinco segundos quando não há formulário em edição. Pedidos e gravações conferem a versão no banco; duas gravações conflitantes não se sobrescrevem. O usuário que receber conflito deve atualizar e conferir a operação.

Pedidos são comandos processados no servidor. Preços, estoque e vendas são calculados na mesma transação. Um identificador único impede que repetir um envio após falha de conexão duplique a venda. Outros módulos administrativos preservam seu formato completo em um documento JSONB versionado e só podem ser gravados por administradores.

Sem internet, o sistema não confirma vendas. Uma tentativa não confirmada fica em um rascunho da sessão deste dispositivo, identificado pelo usuário, com opções para repetir, baixar ou descartar. O rascunho não é uma autenticação nem a base oficial dos dados. Exporte-o antes de limpar os dados do navegador ou encerrar a sessão.

## Segurança e permissões

Administrador: usuários, produtos, estoque, financeiro, backups e recuperação de versões.
Operador: pedidos, clientes, cozinha e entregas. A API não envia compras, custos das vendas, despesas, caixa e auditoria ao operador.

Sessões: cookie HttpOnly, SameSite=Strict e Secure em HTTPS; expiração de oito horas; hash do identificador no banco; invalidação ao sair, trocar senha, editar ou desativar um usuário. Proteção CSRF e verificação exata de origem nos POSTs. Não há JWT nem login de fallback no navegador.

Senhas: bcrypt com custo 12; mínimo de 10 caracteres, letras e números e máximo de 72 bytes. Cadastro inicial exige chave privada do servidor e o email autorizado. O último administrador ativo não pode ser removido. Tentativas de login e recuperação são limitadas no PostgreSQL e funcionam entre instâncias da Vercel.

O log `cloud_audit` é gerado no servidor. Logs presentes no backup antigo são mantidos como importados, sem serem tratados como prova de autoria do servidor.

## Migração dos dados antigos

1. No navegador/dispositivo em que os dados antigos estão salvos, exporte o backup JSON em Configurações e guarde uma cópia.
2. Crie o acesso de administrador na nova versão e importe esse JSON em Configurações.
3. Se a versão nova estiver no mesmo endereço e navegador da antiga, também há o botão **Migrar dados deste navegador**. Ele baixa uma cópia original antes da importação e não apaga o armazenamento antigo.
4. Confira quantidades, pedidos, financeiro e clientes. Só então passe a operar exclusivamente na versão compartilhada.
5. Cadastre novamente os funcionários com senhas novas. Os hashes locais antigos não são convertidos em credenciais do servidor.

Dados guardados em outro navegador ou dispositivo não podem ser descobertos automaticamente pelo servidor. Backups são legíveis e contêm dados da operação e de clientes: guarde-os em local controlado.

## Recuperação e backup

Cada alteração confirmada registra alterações inversas para recuperar versões anteriores. O botão **Recuperar versão anterior** mostra versões recentes e mantém a versão substituída também recuperável. A exportação JSON consulta o servidor e requer administrador.

Esse histórico fica no mesmo banco, portanto não substitui um backup independente contra perda da conta ou do banco. Exporte cópias periodicamente e mantenha uma política de backup no provedor. O plano gratuito tem limites próprios de armazenamento e uso; nenhum plano pago foi contratado. Nesta primeira versão, importações e gravações administrativas completas têm limite de 3 MB. Para volumes maiores, será necessária a evolução para consultas paginadas e migração assistida.

## Executar localmente

Node.js 24 e PostgreSQL. Copie `.env.example` para `.env`, informe uma conexão própria, `APP_ORIGIN=http://localhost:8080` e gere uma `SETUP_KEY` com pelo menos 32 caracteres aleatórios.

```sh
npm ci
npm run db:migrate
npm start
```

A migração só cria as tabelas ausentes. Nunca substitui registros. Credenciais ficam apenas nas variáveis do servidor.

## Vercel

O projeto usa `vercel.json`, uma função Node e o diretório público produzido por `npm run build`. Variáveis: `DATABASE_URL`, `APP_ORIGIN`, `SETUP_KEY` e `SETUP_EMAIL`. Não coloque credenciais em `config/app.config.js`.

O banco Neon remoto exige TLS com verificação de certificado. Recursos de desenvolvimento devem usar um banco separado dos dados reais. Esta entrega foi validada em banco PostgreSQL local isolado antes da publicação.

Recuperação por email é opcional e exige `RESEND_API_KEY` e `EMAIL_FROM` com remetente autorizado. Sem isso, o administrador redefine senhas no módulo Usuários; o sistema não promete enviar emails que não estão configurados.

## Verificações

```sh
npm run check
npm run build
npm test
```

Para executar também a integração real, defina `TEST_DATABASE_URL` apontando para um PostgreSQL local de testes. O teste cria e remove um schema próprio com nome aleatório. Sem essa variável, a integração é explicitamente marcada como ignorada.

Foram verificados setup, cookies, CSRF, origem, último administrador, permissões, migração, leitura por dois clientes, pedidos com preços do servidor, repetição idempotente, concorrência, estoque insuficiente, auditoria, restauração, troca/recuperação de senha, logout e limitação de tentativas. A interface também foi exercitada no navegador, incluindo pedido real no ambiente de teste e largura de celular.
