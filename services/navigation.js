// Responsive navigation moves the same controls, preserving roles and handlers.
(() => {
  const sidebar = document.getElementById('desktopNavigation');
  const tabs = sidebar.querySelector('.tabs');
  const dialog = document.getElementById('navigationDialog');
  const dock = document.querySelector('.mobile-dock');
  const shell = document.querySelector('.app-shell');
  const breakpoint = matchMedia('(max-width: 900px)');
  const close = () => { if (dialog.open) dialog.close(); };
  const layout = () => {
    close();
    if (breakpoint.matches) dialog.append(tabs);
    else sidebar.insertBefore(tabs, sidebar.querySelector('.sidebar-note'));
  };
  document.querySelectorAll('[data-open-navigation]').forEach(button => {
    button.addEventListener('click', () => dialog.showModal());
  });
  document.getElementById('closeNavigation').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  document.addEventListener('pjota:navigate', event => {
    close();
    dock.querySelectorAll('[data-go-tab]').forEach(button => {
      if (button.dataset.goTab === event.detail) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (breakpoint.matches) window.scrollTo({ top: 0, behavior: 'instant' });
  });
  const syncAuth = () => {
    dock.classList.toggle('hidden', shell.classList.contains('hidden'));
    if (shell.classList.contains('hidden')) close();
  };
  new MutationObserver(syncAuth).observe(shell, { attributes: true, attributeFilter: ['class'] });
  breakpoint.addEventListener('change', layout);
  layout();
  syncAuth();
})();
