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
      dialog.addEventListener('cancel', event => { if (dialog.dataset.saving) event.preventDefault(); });
      dialog.addEventListener('close', () => {
        const fallback = document.querySelector('.stock-workspace.active .stock-primary');
        if (!document.activeElement || document.activeElement === document.body) fallback?.focus();
      });
    });
  });
}
function openStockDialog(id, ingredient) {
  if (!isAdmin()) return;
  const dialog = document.getElementById(id);
  dialog.querySelector('.stock-form-message').textContent = '';
  const selected = dialog.querySelector('.stock-selected-item');
  if (selected) selected.textContent = `${ingredient.name} · saldo: ${ingredient.stock.toLocaleString('pt-BR')} ${ingredient.unit}`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('input:not([type=hidden]), select')?.focus();
}
function stockNotice(message) {
  const notice = document.querySelector('.stock-workspace.active .stock-notice') || document.getElementById('stockNotice');
  notice.textContent = message; notice.classList.remove('hidden');
}
function stockFormError(dialogId, message) {
  document.querySelector(`#${dialogId} .stock-form-message`).textContent = message;
}
async function saveStockDialog(dialogId, message) {
  const dialog = document.getElementById(dialogId);
  dialog.dataset.saving = 'true'; dialog.inert = true;
  try {
    await saveState();
    dialog.close(); stockNotice(message); return true;
  } catch (error) {
    stockFormError(dialogId, `${error.message} A operação não foi confirmada. Feche esta janela e consulte o aviso de conexão para recuperar o envio.`);
    return false;
  } finally { delete dialog.dataset.saving; dialog.inert = false; }
}
