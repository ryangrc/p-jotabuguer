// Presentation only. Purchasing, adjustments and persistence remain in app.js.
function inventoryPresentation(item) {
  if (item.stock <= 0) return { key: 'empty', label: 'Sem estoque', className: 'danger' };
  if (item.min <= 0) return { key: 'unset', label: 'Defina o mínimo', className: 'neutral' };
  if (item.stock <= item.min * .5) return { key: 'low', label: 'Estoque crítico', className: 'danger' };
  if (item.stock <= item.min) return { key: 'low', label: 'Repor em breve', className: 'warn' };
  return { key: 'normal', label: 'Acima do mínimo', className: '' };
}
if (typeof module !== 'undefined') module.exports = { inventoryPresentation };
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('pjota:navigate', event => {
      if (['inventory', 'purchases', 'movements'].includes(event.detail)) {
        document.getElementById('pageTitle').focus({ preventScroll: true });
      }
    });
    document.getElementById('newIngredient').addEventListener('click', () => {
      resetIngredientForm(); openStockDialog('ingredientDialog');
    });
    document.getElementById('newPurchase').addEventListener('click', () => {
      resetPurchaseForm(); openStockDialog('purchaseDialog');
    });
    for (const id of ['stockSearch', 'stockFilter']) {
      document.getElementById(id).addEventListener(id === 'stockSearch' ? 'input' : 'change', renderInventory);
    }
    document.querySelectorAll('[data-close-stock]').forEach(button => {
      button.addEventListener('click', () => button.closest('dialog').close());
    });
    document.querySelectorAll('.stock-dialog').forEach(dialog => {
      const message = dialog.querySelector('.stock-form-message');
      message.id = `${dialog.id}-error`;
      message.tabIndex = -1;
      dialog.addEventListener('input', event => {
        clearStockFieldError(event.target, message.id);
      });
      dialog.addEventListener('cancel', event => { if (dialog.dataset.saving) event.preventDefault(); });
      dialog.addEventListener('close', () => {
        // Rendering can replace the row that opened the dialog after a save.
        requestAnimationFrame(() => {
          if (document.querySelector('dialog[open]')) return;
          const origin = dialog.stockReturnFocus;
          const replacement = origin?.dataset.id && [...document.querySelectorAll('.stock-workspace.active button[data-id]')]
            .find(button => button.dataset.id === origin.dataset.id && button.className === origin.className);
          const target = origin?.isConnected ? origin : replacement || document.querySelector('.stock-workspace.active .stock-primary');
          target?.focus();
        });
      });
    });
    document.getElementById('inventory').addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const menu = event.target.closest('.stock-options[open]');
      if (menu) { menu.open = false; menu.querySelector('summary').focus(); event.stopPropagation(); }
    });
  });
}
function openStockDialog(id, ingredient) {
  if (!isAdmin()) return;
  const dialog = document.getElementById(id);
  dialog.stockReturnFocus = document.activeElement;
  dialog.querySelector('.stock-form-message').textContent = '';
  dialog.querySelectorAll('[aria-describedby], [aria-invalid]').forEach(field => clearStockFieldError(field, `${id}-error`));
  const selected = dialog.querySelector('.stock-selected-item');
  if (selected) selected.textContent = `${ingredient.name} · saldo: ${ingredient.stock.toLocaleString('pt-BR')} ${ingredient.unit}`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('input:not([type=hidden]), select')?.focus();
}
function stockNotice(message) {
  const notice = document.querySelector('.stock-workspace.active .stock-notice') || document.getElementById('stockNotice');
  notice.textContent = message; notice.classList.remove('hidden');
}
function clearStockFieldError(field, messageId) {
  field.removeAttribute('aria-invalid');
  const descriptions = (field.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== messageId);
  if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' '));
  else field.removeAttribute('aria-describedby');
}
function stockFormError(dialogId, message, fieldId) {
  const dialog = document.getElementById(dialogId);
  const notice = dialog.querySelector('.stock-form-message');
  dialog.querySelectorAll('[aria-describedby], [aria-invalid]').forEach(field => clearStockFieldError(field, notice.id));
  notice.textContent = message;
  const field = fieldId && dialog.querySelector(`#${fieldId}`);
  if (field) {
    field.setAttribute('aria-invalid', 'true');
    const descriptions = new Set((field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
    descriptions.add(notice.id); field.setAttribute('aria-describedby', [...descriptions].join(' '));
    field.focus();
  }
}
async function saveStockDialog(dialogId, message) {
  const dialog = document.getElementById(dialogId);
  dialog.dataset.saving = 'true'; dialog.inert = true;
  dialog.setAttribute('aria-busy', 'true');
  try {
    await saveState();
    dialog.close(); stockNotice(message); return true;
  } catch (error) {
    stockFormError(dialogId, `${error.message} A operação não foi confirmada. Feche esta janela e consulte o aviso de conexão para recuperar o envio.`);
    return false;
  } finally { delete dialog.dataset.saving; dialog.inert = false; dialog.removeAttribute('aria-busy'); }
}
