# Interface PJ Burguer — Gestão

Modernização baseada na referência visual do Repor fornecida pelo proprietário: superfícies brancas, fundo cinza-azulado, azul nas ações, ícones lineares e status discretos. O símbolo da PJ Burguer preserva um detalhe quente.

## Componentes compartilhados

- `styles.css`: tokens de cor e medidas, navegação, cabeçalhos, cartões, campos, tabelas, badges, diálogos e layouts responsivos. As camadas anteriores de sobrescritas globais foram consolidadas.
- `services/interface.js`: metadados das 17 páginas, ícones SVG locais, cabeçalhos, avatar, mensagens persistentes e abertura dos editores recolhíveis. Não faz chamadas de API nem altera dados de negócio.
- `services/navigation.js`: move os mesmos controles de navegação entre lateral e diálogo móvel; mantém os eventos e as restrições existentes.
- `services/inventory-ui.js`: mantém os fluxos específicos do Estoque e seus status, utilizando a identidade compartilhada.

O azul indica ação ou seleção. Verde, amarelo e vermelho permanecem restritos a estados semânticos. Rótulos textuais acompanham os status: a informação não depende apenas da cor.

## Composição das páginas

Dashboard: indicadores de hoje, produto mais vendido, atenção ao estoque e pedidos recentes. O filtro de período foi mantido em uma seção separada, com indicação de seu alcance; nenhum cálculo foi modificado.

Produtos, usuários, despesas e vendas manuais: formulários recolhíveis. Editar um registro abre automaticamente o formulário correspondente. Todos os campos e limites anteriores foram preservados.

Pedidos e cozinha: quadros por etapa, com rolagem própria. Cardápio: grade de cartões. Estoque: lista responsiva com filtros, reposição e modais existentes. Financeiro e relatórios: combinação de indicadores, históricos, barras e tabelas. Configurações: ações de dados separadas e auditoria recolhível.

## Mensagens e acessibilidade

`uiNotify` substitui avisos informativos nativos por mensagens com texto seguro e botão de dispensar. Não retorna decisões e não substitui confirmações de operações. Se houver um diálogo aberto, a mensagem é inserida nele para permanecer acessível.

`cloudConfirm` e `cloudPrompt` preservam seus retornos e a espera por confirmação. A barra de conexão mantém os controles de recuperação e identifica carregamento, gravação e erro.

Incluídos: link para pular a navegação, foco visível, nomes acessíveis, ícones decorativos ocultos dos leitores de tela, regiões roláveis alcançáveis por teclado, movimento reduzido e áreas seguras do celular.

## Verificação desta entrega

- 20 testes aprovados com PostgreSQL local isolado; nenhum ignorado.
- Sintaxe, build e verificação de diferenças aprovados.
- Comparação estrutural: 82 campos e suas restrições preservados; 17 módulos preservados; IDs únicos.
- Integração de interface em DOM com servidor local: login, navegação pelos 17 módulos, 12 ícones, transferência da navegação entre estruturas desktop/móvel, abertura de editores e modais, mensagens e confirmação.
- JSDOM usado apenas em `work/ui-test-runtime` para teste temporário. Nenhuma dependência adicionada ao pacote de produção.

O teste em DOM não mede layout nem substitui inspeção visual em navegadores reais. O controle visual do navegador estava indisponível nesta etapa; validação final de aparência, toque e teclado em aparelhos reais continua pendente. Nenhuma regra financeira, tabela do banco ou contrato de API foi alterado.
