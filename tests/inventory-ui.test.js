const test = require('node:test');
const assert = require('node:assert/strict');
const { inventoryPresentation } = require('../services/inventory-ui');
test('estoque vazio nunca aparece como suficiente, mesmo sem mínimo', () => {
  for (const min of [0, 10]) assert.equal(inventoryPresentation({ stock: 0, min }).key, 'empty');
});
test('saldo positivo sem mínimo pede configuração, sem inventar limite', () => {
  assert.equal(inventoryPresentation({ stock: 5, min: 0 }).key, 'unset');
});
test('apresentação preserva limites de atenção e crítico e não altera o ingrediente', () => {
  const ingredient = { stock: 5, min: 10 };
  assert.equal(inventoryPresentation(ingredient).label, 'Estoque crítico');
  assert.equal(inventoryPresentation({ stock: 10, min: 10 }).key, 'low');
  assert.equal(inventoryPresentation({ stock: 11, min: 10 }).key, 'normal');
  assert.deepEqual(ingredient, { stock: 5, min: 10 });
});
