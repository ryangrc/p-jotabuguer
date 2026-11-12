// Shared presentation layer. No network requests or business state writes.
const PAGE_PRESENTATION = {
  dashboard: ['Visão geral', 'Os números de hoje e o que precisa da sua atenção.', 'dashboard'],
  menu: ['Pedidos', 'Da chegada do pedido à entrega. Acompanhe cada etapa.', 'receipt'],
  customers: ['Clientes', 'Um histórico organizado de quem compra com você.', 'users'],
  kitchen: ['Cozinha', 'Prioridades claras para uma produção bem coordenada.', 'chef'],
  deliveries: ['Entregas', 'Acompanhe as saídas e as entregas em andamento.', 'truck'],
  cardapio: ['Cardápio', 'Seus produtos, apresentados com cuidado.', 'book'],
  products: ['Produtos', 'Organize o catálogo, os preços e as fichas técnicas.', 'box'],
  inventory: ['Estoque', 'Cada ingrediente no seu lugar. Cada quantidade atualizada.', 'layers'],
  purchases: ['Compras', 'Registre as entradas e acompanhe o investimento em ingredientes.', 'cart'],
  movements: ['Movimentações', 'Entradas, consumo e ajustes em um só histórico.', 'history'],
  finance: ['Financeiro', 'Receitas, despesas e caixa com uma visão organizada.', 'wallet'],
  cash: ['Fechamento por data', 'Confira os registros e o resultado do caixa.', 'wallet'],
  sales: ['Vendas manuais', 'Registre e consulte as vendas da sua operação.', 'receipt'],
  investment: ['CMV e investimento', 'Acompanhe os custos e os indicadores já calculados pelo sistema.', 'chart'],
  reports: ['Relatórios', 'Transforme os registros da operação em informação útil.', 'chart'],
  users: ['Usuários', 'Gerencie os acessos e as responsabilidades da equipe.', 'users'],
  settings: ['Configurações', 'Ajustes do negócio, backups e segurança dos seus dados.', 'settings'],
};
const UI_ICON_PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  box: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 10 9-5M12 13 3 8m9 5v8M7.5 5.5l9 5"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  receipt: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm4 5h6M9 12h6"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/>',
  chef: '<path d="M6 14a5 5 0 0 1 0-10 7 7 0 0 1 12 0 5 5 0 0 1 0 10v7H6v-7Zm0 3h12M10 8v5m4-5v5"/>',
  truck: '<path d="M2 5h12v12H2V5Zm12 5h4l4 4v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  book: '<path d="M12 5C8 2 4 3 2 4v16c3-2 7-1 10 1 3-2 7-3 10-1V4c-2-1-6-2-10 1Zm0 0v16"/>',
  cart: '<path d="M3 4h2l3 12h11l3-9H6M10 20h.01M18 20h.01"/>',
  history: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2"/>',
  wallet: '<path d="M20 7V4H5a3 3 0 0 0 0 6h17v10H5a3 3 0 0 1-3-3V7m20 7h-6v3h6"/>',
  chart: '<path d="M3 3v18h18M7 16v-5m5 5V7m5 9V4"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
};
function uiIcon(name) {
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${UI_ICON_PATHS[name] || UI_ICON_PATHS.box}</svg>`;
}
function openEditor(formId) {
  const disclosure = document.getElementById(formId)?.closest('details.editor-panel');
  if (disclosure) disclosure.open = true;
}
function uiNotify(message) {
  const region = document.getElementById('uiNotifications');
  if (!region) return;
  // A persistent, dismissible message replaces informational native alerts.
  // Validation return values and confirmation dialogs remain unchanged.
  const notice = document.createElement('div'); notice.className = 'ui-notification'; notice.setAttribute('role', 'alert');
  const text = document.createElement('p'); text.textContent = String(message);
  const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Entendi';
  close.addEventListener('click', () => notice.remove());
  notice.append(text, close); (document.querySelector('dialog[open]') || region).append(notice);
}
if (typeof module !== 'undefined') module.exports = { PAGE_PRESENTATION, UI_ICON_PATHS, uiIcon };
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
  const region = document.createElement('section'); region.id = 'uiNotifications'; region.setAttribute('aria-label', 'Mensagens do sistema'); document.body.append(region);
  document.querySelectorAll('[data-ui-icon]').forEach(node => { node.innerHTML = uiIcon(node.dataset.uiIcon); });
  document.querySelectorAll('.tab-button').forEach(button => {
    const text = document.createElement('span'); text.textContent = button.textContent.trim();
    button.textContent = ''; button.insertAdjacentHTML('afterbegin', uiIcon(PAGE_PRESENTATION[button.dataset.tab]?.[2])); button.append(text);
  });
  document.querySelectorAll('.dashboard-stats .stat-card').forEach((card, index) => {
    card.insertAdjacentHTML('afterbegin', `<span class="metric-icon">${uiIcon(['wallet', 'receipt', 'chart', 'layers', 'box'][index])}</span>`);
  });
  document.querySelectorAll('.table-wrap').forEach(wrapper => {
    wrapper.tabIndex = 0; wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', wrapper.closest('.panel')?.querySelector('h2')?.textContent || 'Lista de registros');
  });
  document.querySelectorAll('.editor-panel').forEach(editor => {
    const summary = editor.querySelector('summary'), title = editor.querySelector('h2');
    const label = summary.textContent;
    new MutationObserver(() => { summary.textContent = title.textContent.startsWith('Editar') ? title.textContent : label; })
      .observe(title, { childList: true, subtree: true, characterData: true });
  });
  const page = id => {
    const meta = PAGE_PRESENTATION[id] || [document.getElementById('pageTitle').textContent, '', 'box'];
    document.getElementById('pageTitle').textContent = meta[0];
    document.getElementById('pageCrumb').textContent = meta[0];
    document.getElementById('pageDescription').textContent = meta[1];
    document.getElementById('pageGroup').textContent = ['finance', 'cash', 'investment', 'reports'].includes(id) ? 'GESTÃO FINANCEIRA' : 'MEU NEGÓCIO';
    document.body.dataset.page = id;
    document.querySelector('.dashboard-action').classList.toggle('hidden', id !== 'dashboard');
    document.querySelectorAll('.account-menu').forEach(menu => { menu.open = false; });
  };
  document.addEventListener('pjota:navigate', event => page(event.detail));
  page(document.querySelector('.tab-panel.active')?.id || 'dashboard');
  const date = document.getElementById('workspaceDate');
  const updateDate = () => { const now = new Date(); date.dateTime = now.toISOString(); date.textContent = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }); };
  updateDate(); setInterval(updateDate, 60000);
  const badge = document.getElementById('currentUserBadge');
  const updateAvatar = () => { const name = badge.textContent.replace(/\s*\([^)]*\)\s*$/, '').trim(); document.getElementById('userAvatar').textContent = name.split(/\s+/).slice(0, 2).map(word => word[0] || '').join('').toUpperCase() || 'PJ'; };
  new MutationObserver(updateAvatar).observe(badge, { childList: true, characterData: true, subtree: true }); updateAvatar();
  document.querySelectorAll('.account-menu').forEach(menu => {
    menu.addEventListener('keydown', event => { if (event.key === 'Escape') { menu.open = false; menu.querySelector('summary').focus(); } });
  });
});
