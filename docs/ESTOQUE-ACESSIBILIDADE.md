# Piloto de acessibilidade — Estoque

Entrega de 12/11/2026. Escopo: Ingredientes, seus diálogos, apresentação de Compras/Movimentações e navegação que acompanha essas páginas. Os demais módulos não recebem o novo tema. Não é uma declaração de conformidade WCAG 2.2 AA.

## Alterações

- `services/inventory-accessibility.css`: camada isolada, tipografia em rem (base 16 px; auxiliares 14 px; título 28 px; indicadores 32 px), controles com mínimo de 44–48 px, bordas e foco mais contrastantes, cartões adaptativos e regras para alto contraste do sistema.
- `index.html`: carregamento da folha de estilo, hierarquia h1/h2, resultado da busca anunciado com status e semântica explícita da tabela.
- `app.js`: somente marcação de apresentação e identificação dos campos envolvidos nas validações já existentes. Nenhum limite, cálculo ou operação foi alterado.
- `services/inventory-ui.js`: foco no título ao navegar no estoque, restauração do foco após fechar/salvar (inclusive quando a linha foi recriada), Escape no menu de opções, aria-invalid/aria-describedby e estado de gravação.
- Mantida a regra de saldo zero como Sem estoque; saldo positivo sem mínimo como Defina o mínimo. Cadastro e reposição continuam separados.
- O cabeçalho usa fluxo normal, sem a margem negativa que sobrepunha o botão ao título. No desktop a ação fica na linha da navegação secundária. Em telas estreitas os elementos se empilham, sem reduzir as fontes.

## Verificações executadas

- 20 testes aprovados com PostgreSQL local isolado; zero falhas/ignorados. Incluem autenticação, CSRF, permissões, concorrência, idempotência e estoque.
- Sintaxe, build, diff e integração DOM dos 17 módulos aprovados. Todos os 82 controles com ID e suas restrições originais preservados; sem IDs duplicados.
- axe-core 4.10.3 executado no navegador, exclusivamente em servidor local de teste, com tags WCAG 2 A/AA, 2.1 AA e 2.2 AA. Zero violações detectadas nos estados inspecionados de Ingredientes, Compras, Movimentações, cadastro e reposição. Os diálogos retornaram 18/20 regras aprovadas, sem resultados incompletos; a lista apresentou resultados incompletos em contraste e, em alguns estados, atributos ARIA, que não equivalem a aprovação automática.
- Inspeção visual em larguras de 1440, 768, 390 e 320 CSS px. Em 320 px: largura do documento 305 px (descontada a barra de rolagem), sem transbordamento horizontal da página. Tabelas de históricos continuam com rolagem interna quando necessária.
- Ampliação da fonte raiz de 16 para 32 px no ambiente de teste: campos em 32 px, conteúdo e diálogo continuam acessíveis por rolagem vertical, sem transbordamento horizontal da página. Este é um teste de ampliação de texto, não de zoom nativo do navegador.
- Teclado: Tab entre controles, Enter/Escape no menu de opções, fechamento do diálogo com Escape, foco no campo inválido e retorno ao botão de origem após salvar a reposição.
- Fluxo real no servidor de teste: cadastro de ingrediente vazio; reposição de 2 unidades por R$ 10; saldo confirmado, compra e movimentação disponíveis. Busca sem resultados e retorno à lista verificados. Nenhum dado de produção utilizado ou modificado.
- Comparação visual com a versão anterior recuperada do Git, usando os mesmos dados locais. Capturas na pasta outputs: estoque-antes.png, estoque-aa-desktop.png e estoque-aa-celular.png.
- axe-core e JSDOM estão apenas no diretório temporário work, excluído da publicação. Nenhuma dependência adicionada ao pacote de produção.

## Limites e próximas etapas

Ainda pendentes: leitor de tela real (NVDA/Narrador/VoiceOver), zoom nativo do navegador, aparelhos físicos e validação manual completa dos critérios WCAG. A árvore de acessibilidade foi inspecionada, mas não substitui uma sessão com leitor de tela. As regras de contraste forçado e movimento reduzido não foram verificadas em todos os sistemas operacionais.

Preferências de tamanho/contraste sincronizadas por usuário e Identidade da marca permanecem na etapa futura aprovada como separada. Exigem apresentar o contrato de persistência antes de mudar API/banco. Não foi criada uma preferência apenas local que aparentasse sincronizar entre dispositivos.

O restante do sistema deve receber esses padrões gradualmente após a avaliação do piloto. Segurança, permissões, APIs, banco e cálculos continuam inalterados.
