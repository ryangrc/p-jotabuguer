(function (root, factory) {
  const service = factory();
  if (typeof module === "object" && module.exports) module.exports = service;
  root.PJotaOrderInventoryService = service;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const number = (value) => Number(value);

  function calculateRequirements(items, products) {
    const productMap = new Map(products.map((product) => [String(product.id), product]));
    const required = new Map();

    if (!Array.isArray(items) || !items.length) {
      return { ok: false, message: "Adicione pelo menos um produto ao pedido.", requirements: [] };
    }

    for (const item of items) {
      const quantity = number(item.quantity);
      const price = number(item.price);
      const product = productMap.get(String(item.productId));
      if (!product) return { ok: false, message: "Um produto do pedido nao foi encontrado.", requirements: [] };
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        return { ok: false, message: `Informe uma quantidade inteira e positiva para ${product.name}.`, requirements: [] };
      }
      if (!Number.isFinite(price) || price < 0) {
        return { ok: false, message: `O preco de ${product.name} e invalido.`, requirements: [] };
      }
      if (!Array.isArray(product.recipe) || !product.recipe.length) {
        return { ok: false, message: `${product.name} nao possui ficha tecnica.`, requirements: [] };
      }

      for (const line of product.recipe) {
        const recipeQuantity = number(line.quantity);
        if (!line.ingredientId || !Number.isFinite(recipeQuantity) || recipeQuantity <= 0) {
          return { ok: false, message: `A ficha tecnica de ${product.name} esta incompleta.`, requirements: [] };
        }
        const ingredientId = String(line.ingredientId);
        required.set(ingredientId, (required.get(ingredientId) || 0) + recipeQuantity * quantity);
      }
    }

    return {
      ok: true,
      message: "",
      requirements: [...required.entries()].map(([ingredientId, quantity]) => ({ ingredientId, quantity })),
    };
  }

  function validateAvailability(requirements, ingredients) {
    const ingredientMap = new Map(ingredients.map((ingredient) => [String(ingredient.id), ingredient]));
    for (const requirement of requirements) {
      const ingredient = ingredientMap.get(String(requirement.ingredientId));
      if (!ingredient) return { ok: false, message: "Um ingrediente da ficha tecnica nao foi encontrado." };
      if (number(ingredient.stock) < requirement.quantity) {
        return {
          ok: false,
          message: `Estoque insuficiente de ${ingredient.name}. Necessario: ${requirement.quantity} ${ingredient.unit}; disponivel: ${number(ingredient.stock)} ${ingredient.unit}.`,
        };
      }
    }
    return { ok: true, message: "" };
  }

  function deductOnce(order, items, products, ingredients, now = new Date().toISOString()) {
    if (order.inventoryDeductedAt) {
      return { ok: true, alreadyDeducted: true, requirements: [], message: "O estoque deste pedido ja foi baixado." };
    }

    const calculation = calculateRequirements(items, products);
    if (!calculation.ok) return calculation;
    const availability = validateAvailability(calculation.requirements, ingredients);
    if (!availability.ok) return { ...availability, requirements: calculation.requirements };

    const ingredientMap = new Map(ingredients.map((ingredient) => [String(ingredient.id), ingredient]));
    calculation.requirements.forEach((requirement) => {
      const ingredient = ingredientMap.get(String(requirement.ingredientId));
      ingredient.stock = number(ingredient.stock) - requirement.quantity;
    });
    order.inventoryDeductedAt = now;
    return { ok: true, alreadyDeducted: false, requirements: calculation.requirements, message: "" };
  }

  return { calculateRequirements, validateAvailability, deductOnce };
});
