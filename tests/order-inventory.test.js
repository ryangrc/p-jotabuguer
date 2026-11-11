const test = require("node:test");
const assert = require("node:assert/strict");
const service = require("../services/order-inventory.service.js");

function fixture(stock = 1000) {
  return {
    ingredients: [
      { id: "carne", name: "Carne", unit: "g", stock },
      { id: "pao", name: "Pao", unit: "un", stock: 10 },
    ],
    products: [
      {
        id: "burger",
        name: "Burger",
        recipe: [
          { ingredientId: "carne", quantity: 100 },
          { ingredientId: "pao", quantity: 1 },
        ],
      },
    ],
  };
}

test("calcula a baixa da ficha tecnica para uma unidade", () => {
  const data = fixture();
  const result = service.calculateRequirements([{ productId: "burger", quantity: 1, price: 20 }], data.products);
  assert.equal(result.ok, true);
  assert.deepEqual(result.requirements, [
    { ingredientId: "carne", quantity: 100 },
    { ingredientId: "pao", quantity: 1 },
  ]);
});

test("multiplica a baixa quando o pedido possui varias unidades", () => {
  const data = fixture();
  const order = {};
  const result = service.deductOnce(order, [{ productId: "burger", quantity: 3, price: 20 }], data.products, data.ingredients, "2026-01-01T00:00:00.000Z");
  assert.equal(result.ok, true);
  assert.equal(data.ingredients[0].stock, 700);
  assert.equal(data.ingredients[1].stock, 7);
});

test("bloqueia pedido quando o estoque e insuficiente sem alterar saldos", () => {
  const data = fixture(90);
  const order = {};
  const result = service.deductOnce(order, [{ productId: "burger", quantity: 1, price: 20 }], data.products, data.ingredients);
  assert.equal(result.ok, false);
  assert.match(result.message, /Estoque insuficiente de Carne/);
  assert.equal(data.ingredients[0].stock, 90);
  assert.equal(data.ingredients[1].stock, 10);
  assert.equal(order.inventoryDeductedAt, undefined);
});

test("nao permite baixar duas vezes o mesmo pedido", () => {
  const data = fixture();
  const order = {};
  const items = [{ productId: "burger", quantity: 2, price: 20 }];
  const first = service.deductOnce(order, items, data.products, data.ingredients, "2026-01-01T00:00:00.000Z");
  const second = service.deductOnce(order, items, data.products, data.ingredients, "2026-01-01T00:01:00.000Z");
  assert.equal(first.alreadyDeducted, false);
  assert.equal(second.alreadyDeducted, true);
  assert.equal(data.ingredients[0].stock, 800);
  assert.equal(data.ingredients[1].stock, 8);
});

test("rejeita quantidade negativa e produto sem ficha tecnica", () => {
  const data = fixture();
  const negative = service.calculateRequirements([{ productId: "burger", quantity: -1, price: 20 }], data.products);
  const withoutRecipe = service.calculateRequirements(
    [{ productId: "empty", quantity: 1, price: 10 }],
    [{ id: "empty", name: "Sem receita", recipe: [] }],
  );
  assert.equal(negative.ok, false);
  assert.equal(withoutRecipe.ok, false);
  assert.match(withoutRecipe.message, /nao possui ficha tecnica/);
});
