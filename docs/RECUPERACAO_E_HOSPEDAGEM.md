# Recuperacao, acesso e hospedagem

Este projeto roda como site estatico. O arquivo principal e `index.html`.

## Recuperar acesso local

1. Abra `index.html` no navegador ou rode `npm start`.
2. No primeiro acesso, crie o usuario administrador.
3. Se ja existir usuario, entre com email e senha cadastrados.
4. Se precisar migrar dados de outro computador, use `Configuracoes > Importar backup`.

Importante: os dados ficam no navegador usando `localStorage`. Em hospedagem estatica, cada computador ou navegador tera sua propria base local.

## Rodar localmente como site

Com Node.js instalado:

```bash
npm start
```

Depois abra:

```text
http://localhost:8080
```

Tambem e possivel abrir `index.html` diretamente, mas o servidor local deixa o comportamento mais parecido com hospedagem real.

## Hospedar agora sem backend

Opcao simples:

1. Envie estes arquivos para uma hospedagem estatica:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `config/`
   - `models/`
   - `repositories/`
   - `services/`
   - `controllers/`
   - `ui/`
2. Aponte o dominio para o `index.html`.
3. Crie o administrador no primeiro acesso.
4. Gere backups JSON com frequencia.

## Vercel

O arquivo `vercel.json` ja esta pronto para publicacao estatica.

Configurar:

- Framework preset: Other
- Build command: vazio
- Output directory: `.`

## Netlify

O arquivo `netlify.toml` ja esta pronto.

Configurar:

- Build command: vazio
- Publish directory: `.`

## Limites da hospedagem estatica

Nesta fase, hospedar o site nao cria banco compartilhado.

Isso significa:

- computador A nao ve automaticamente os dados do computador B;
- iPhone nao sincroniza automaticamente com computador;
- backup/importacao ainda e necessario;
- login e local, nao remoto.

Para sincronizacao real, a proxima fase deve migrar armazenamento para backend/API e banco de dados.

## Proxima etapa recomendada

Antes de backend:

1. Separar mais regras do `app.js` em `services/`.
2. Separar renderizacao em `ui/`.
3. Criar um `repositories/state.repository.js`.
4. Criar uma versao de API repository futuramente sem alterar regras de negocio.
