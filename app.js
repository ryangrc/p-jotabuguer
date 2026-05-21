const STORAGE_KEY = "burgerstock.v1";

const defaultState = {
  ingredients: [],
  products: [],
  purchases: [],
  sales: [],
};

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone(value) {
  if (globalThis.structuredClone) return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

const exampleState = {
  ingredients: [
    { id: createId(), name: "Pao brioche", unit: "un", stock: 40, min: 12 },
    { id: createId(), name: "Carne smash 90g", unit: "un", stock: 55, min: 20 },
    { id: createId(), name: "Queijo cheddar", unit: "un", stock: 46, min: 18 },
    { id: createId(), name: "Alface", unit: "g", stock: 900, min: 300 },
    { id: createId(), name: "Molho da casa", unit: "ml", stock: 1200, min: 350 },
  ],
  products: [],
  purchases: [],
  sales: [],
};

exampleState.products = [
  {
    id: createId(),
    name: "Classico cheddar",
    price: 28,
    recipe: [
      { ingredientId: exampleState.ingredients[0].id, quantity: 1 },
      { ingredientId: exampleState.ingredients[1].id, quantity: 1 },
      { ingredientId: exampleState.ingredients[2].id, quantity: 2 },
      { ingredientId: exampleState.ingredients[4].id, quantity: 25 },
    ],
  },
  {
    id: createId(),
    name: "Salada da casa",
    price: 31,
    recipe: [
      { ingredientId: exampleState.ingredients[0].id, quantity: 1 },
      { ingredientId: exampleState.ingredients[1].id, quantity: 1 },
      { ingredientId: exampleState.ingredients[2].id, quantity: 1 },
      { ingredientId: exampleState.ingredients[3].id, quantity: 35 },
      { ingredientId: exampleState.ingredients[4].id, quantity: 30 },
    ],
  },
];

exampleState.purchases = [
  {
    id: createId(),
    ingredientId: exampleState.ingredients[0].id,
    ingredientName: exampleState.ingredients[0].name,
    unit: exampleState.ingredients[0].unit,
    quantity: 40,
    cost: 48,
    date: new Date().toISOString(),
  },
  {
    id: createId(),
    ingredientId: exampleState.ingredients[1].id,
    ingredientName: exampleState.ingredients[1].name,
    unit: exampleState.ingredients[1].unit,
    quantity: 55,
    cost: 165,
    date: new Date().toISOString(),
  },
  {
    id: createId(),
    ingredientId: exampleState.ingredients[2].id,
    ingredientName: exampleState.ingredients[2].name,
    unit: exampleState.ingredients[2].unit,
    quantity: 46,
    cost: 69,
    date: new Date().toISOString(),
  },
  {
    id: createId(),
    ingredientId: exampleState.ingredients[3].id,
    ingredientName: exampleState.ingredients[3].name,
    unit: exampleState.ingredients[3].unit,
    quantity: 900,
    cost: 27,
    date: new Date().toISOString(),
  },
  {
    id: createId(),
    ingredientId: exampleState.ingredients[4].id,
    ingredientName: exampleState.ingredients[4].name,
    unit: exampleState.ingredients[4].unit,
    quantity: 1200,
    cost: 36,
    date: new Date().toISOString(),
  },
];

let state = loadState();

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return clone(defaultState);

  try {
    return { ...clone(defaultState), ...JSON.parse(raw) };
  } catch {
    return clone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function registerPurchase(ingredient, quantity, cost) {
  ingredient.stock += quantity;
  state.purchases.push({
    id: createId(),
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    unit: ingredient.unit,
    quantity,
    cost,
    date: new Date().toISOString(),
  });
}

function formatQuantity(value, unit) {
  return `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${escapeHtml(unit)}`;
}

function findIngredient(id) {
  return state.ingredients.find((item) => item.id === id);
}

function findProduct(id) {
  return state.products.find((item) => item.id === id);
}

function findSale(id) {
  return state.sales.find((item) => item.id === id);
}

function ingredientOptions(selectedId = "") {
  return state.ingredients
    .map(
      (item) =>
        `<option value="${item.id}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.name)} (${escapeHtml(item.unit)})</option>`,
    )
    .join("");
}

function renderAll() {
  renderSelects();
  renderDashboard();
  renderInventory();
  renderProducts();
  renderInvestment();
  renderPurchases();
  renderSales();
  renderRecipePreview();
  updateSaleHint();
}

function renderSelects() {
  const ingredientSelects = ["#purchaseIngredient", ".recipe-ingredient"];
  ingredientSelects.forEach((selector) => {
    $$(selector).forEach((select) => {
      const selected = select.value;
      select.innerHTML = ingredientOptions(selected);
    });
  });

  $("#saleProduct").innerHTML = state.products
    .map((product) => `<option value="${product.id}">${escapeHtml(product.name)}</option>`)
    .join("");

  const selectedProduct = findProduct($("#saleProduct").value) || state.products[0];
  $("#salePrice").value = selectedProduct ? selectedProduct.price.toFixed(2) : "";
}

function renderDashboard() {
  const revenue = state.sales.reduce((sum, sale) => sum + sale.total, 0);
  const costs = state.purchases.reduce((sum, purchase) => sum + purchase.cost, 0);
  const alerts = state.ingredients.filter((item) => item.stock <= item.min);

  $("#statRevenue").textContent = currency.format(revenue);
  $("#statCosts").textContent = currency.format(costs);
  $("#statProfit").textContent = currency.format(revenue - costs);
  $("#statAlerts").textContent = alerts.length;

  $("#alertsTable").innerHTML =
    alerts
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${formatQuantity(item.stock, item.unit)}</td>
          <td>${formatQuantity(item.min, item.unit)}</td>
          <td><span class="badge danger">Comprar</span></td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="4" class="empty">Nenhum ingrediente abaixo do minimo.</td></tr>`;

  const movements = [
    ...state.sales.map((sale) => ({ type: "Venda", date: sale.date, label: sale.productName, value: sale.total })),
    ...state.purchases.map((purchase) => ({
      type: "Compra",
      date: purchase.date,
      label: purchase.ingredientName,
      value: purchase.cost,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  $("#movementList").innerHTML =
    movements
      .map(
        (item) => `<li>
          <strong>${item.type}: ${escapeHtml(item.label)}</strong>
          <small>${dateFormat.format(new Date(item.date))} - ${currency.format(item.value)}</small>
        </li>`,
      )
      .join("") || `<li class="empty">Sem movimentos registrados.</li>`;
}

function renderInventory() {
  $("#inventoryTable").innerHTML =
    state.ingredients
      .map((item) => {
        const statusClass = item.stock <= item.min ? "danger" : item.stock <= item.min * 1.5 ? "warn" : "";
        const statusLabel = item.stock <= item.min ? "Baixo" : item.stock <= item.min * 1.5 ? "Atencao" : "Ok";
        return `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${formatQuantity(item.stock, item.unit)}</td>
          <td>${formatQuantity(item.min, item.unit)}</td>
          <td><span class="badge ${statusClass}">${statusLabel}</span></td>
          <td>
            <div class="row-actions">
              <button class="ghost-button edit-ingredient" type="button" data-id="${item.id}">Editar</button>
              <button class="ghost-button restock-ingredient" type="button" data-id="${item.id}">Repor</button>
              <button class="danger-button delete-ingredient" type="button" data-id="${item.id}">Excluir</button>
            </div>
          </td>
        </tr>`;
      })
      .join("") || `<tr><td colspan="5" class="empty">Cadastre ingredientes para iniciar o estoque.</td></tr>`;

  $$(".edit-ingredient").forEach((button) => {
    button.addEventListener("click", () => startIngredientEdit(button.dataset.id));
  });

  $$(".restock-ingredient").forEach((button) => {
    button.addEventListener("click", () => startIngredientRestock(button.dataset.id));
  });

  $$(".delete-ingredient").forEach((button) => {
    button.addEventListener("click", () => deleteIngredient(button.dataset.id));
  });
}

function renderProducts() {
  $("#productList").innerHTML =
    state.products
      .map((product) => {
        const recipeItems = product.recipe
          .map((line) => {
            const ingredient = findIngredient(line.ingredientId);
            return ingredient
              ? `<li>${formatQuantity(line.quantity, ingredient.unit)} de ${escapeHtml(ingredient.name)}</li>`
              : "";
          })
          .filter(Boolean)
          .join("");

        return `<article class="product-card">
          <div class="product-card-header">
            <strong>${escapeHtml(product.name)} - ${currency.format(product.price)}</strong>
            <button class="danger-button delete-product" type="button" data-id="${product.id}">Excluir</button>
          </div>
          <small>Baixa automatica de estoque ao vender 1 unidade:</small>
          <ul>${recipeItems || "<li>Sem materia-prima cadastrada</li>"}</ul>
        </article>`;
      })
      .join("") || `<div class="empty">Cadastre hamburgueres e suas receitas.</div>`;

  $$(".delete-product").forEach((button) => {
    button.addEventListener("click", () => deleteProduct(button.dataset.id));
  });
}

function getIngredientCostStats(ingredientId) {
  const purchases = state.purchases.filter((purchase) => purchase.ingredientId === ingredientId);
  const quantity = purchases.reduce((sum, purchase) => sum + Number(purchase.quantity || 0), 0);
  const cost = purchases.reduce((sum, purchase) => sum + Number(purchase.cost || 0), 0);

  return {
    totalQuantity: quantity,
    totalCost: cost,
    averageCost: quantity > 0 ? cost / quantity : 0,
  };
}

function calculateProductCmv(product) {
  return product.recipe.reduce((sum, line) => {
    const ingredient = findIngredient(line.ingredientId);
    if (!ingredient) return sum;

    const { averageCost } = getIngredientCostStats(ingredient.id);
    return sum + averageCost * line.quantity;
  }, 0);
}

function renderInvestment() {
  const stockValue = state.ingredients.reduce((sum, ingredient) => {
    const { averageCost } = getIngredientCostStats(ingredient.id);
    return sum + averageCost * ingredient.stock;
  }, 0);
  const totalPurchased = state.purchases.reduce((sum, purchase) => sum + Number(purchase.cost || 0), 0);
  const productMetrics = state.products.map((product) => {
    const cmv = calculateProductCmv(product);
    const profit = product.price - cmv;
    return { product, cmv, profit };
  });
  const averageCmv =
    productMetrics.length > 0
      ? productMetrics.reduce((sum, metric) => sum + metric.cmv, 0) / productMetrics.length
      : 0;
  const averageProfit =
    productMetrics.length > 0
      ? productMetrics.reduce((sum, metric) => sum + metric.profit, 0) / productMetrics.length
      : 0;

  $("#statStockValue").textContent = currency.format(stockValue);
  $("#statTotalPurchased").textContent = currency.format(totalPurchased);
  $("#statAverageCmv").textContent = currency.format(averageCmv);
  $("#statAverageProductProfit").textContent = currency.format(averageProfit);

  $("#ingredientInvestmentTable").innerHTML =
    state.ingredients
      .map((ingredient) => {
        const { averageCost, totalCost } = getIngredientCostStats(ingredient.id);
        const invested = averageCost * ingredient.stock;

        return `<tr>
          <td>${escapeHtml(ingredient.name)}</td>
          <td>${currency.format(averageCost)} / ${escapeHtml(ingredient.unit)}</td>
          <td>${currency.format(totalCost)}</td>
          <td>${formatQuantity(ingredient.stock, ingredient.unit)}</td>
          <td>${currency.format(invested)}</td>
        </tr>`;
      })
      .join("") ||
    `<tr><td colspan="5" class="empty">Cadastre compras para calcular o investimento.</td></tr>`;

  $("#productCmvTable").innerHTML =
    productMetrics
      .map(({ product, cmv, profit }) => {
        const cmvPercent = product.price > 0 ? (cmv / product.price) * 100 : 0;

        return `<tr>
          <td>${escapeHtml(product.name)}</td>
          <td>${currency.format(product.price)}</td>
          <td>${currency.format(cmv)}</td>
          <td>${cmvPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</td>
          <td>${currency.format(profit)}</td>
        </tr>`;
      })
      .join("") ||
    `<tr><td colspan="5" class="empty">Cadastre produtos com ficha tecnica para calcular o CMV.</td></tr>`;
}

function renderPurchases() {
  $("#purchasesTable").innerHTML =
    state.purchases
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(
        (purchase) => `<tr>
          <td>${dateFormat.format(new Date(purchase.date))}</td>
          <td>${escapeHtml(purchase.ingredientName)}</td>
          <td>${formatQuantity(purchase.quantity, purchase.unit)}</td>
          <td>${currency.format(purchase.cost)}</td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="4" class="empty">Nenhuma compra registrada.</td></tr>`;
}

function renderSales() {
  $("#salesTable").innerHTML =
    state.sales
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(
        (sale) => `<tr>
          <td>${dateFormat.format(new Date(sale.date))}</td>
          <td>${escapeHtml(sale.productName)}</td>
          <td>${sale.quantity}</td>
          <td>${currency.format(sale.total)}</td>
          <td>
            <div class="row-actions">
              <button class="ghost-button edit-sale" type="button" data-id="${sale.id}">Editar</button>
            </div>
          </td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="5" class="empty">Nenhuma venda registrada.</td></tr>`;

  $$(".edit-sale").forEach((button) => {
    button.addEventListener("click", () => startSaleEdit(button.dataset.id));
  });
}

function addRecipeLine(selectedId = "", quantity = "") {
  const template = $("#recipeLineTemplate").content.cloneNode(true);
  const line = template.querySelector(".recipe-line");
  const select = line.querySelector(".recipe-ingredient");
  const input = line.querySelector(".recipe-quantity");

  select.innerHTML = ingredientOptions(selectedId);
  input.value = quantity;
  select.addEventListener("change", renderRecipePreview);
  input.addEventListener("input", renderRecipePreview);
  line.querySelector(".remove-line").addEventListener("click", () => {
    line.remove();
    renderRecipePreview();
  });
  $("#recipeLines").append(line);
  renderRecipePreview();
}

function getRecipeLinesFromForm() {
  return $$(".recipe-line")
    .map((line) => ({
      ingredientId: line.querySelector(".recipe-ingredient").value,
      quantity: Number(line.querySelector(".recipe-quantity").value),
    }))
    .filter((line) => line.ingredientId && line.quantity > 0);
}

function renderRecipePreview() {
  const preview = $("#recipePreview");
  if (!preview) return;

  const recipe = getRecipeLinesFromForm();
  preview.innerHTML =
    recipe
      .map((line) => {
        const ingredient = findIngredient(line.ingredientId);
        if (!ingredient) return "";
        return `<li>${formatQuantity(line.quantity, ingredient.unit)} de ${escapeHtml(ingredient.name)}</li>`;
      })
      .join("") || "<li>Nenhuma materia-prima selecionada.</li>";
}

function resetSaleForm() {
  $("#saleForm").reset();
  $("#saleId").value = "";
  $("#saleQuantity").value = 1;
  $("#saleFormTitle").textContent = "Registrar venda";
  $("#saleSubmit").textContent = "Salvar venda";
  $("#cancelSaleEdit").classList.add("hidden");
  renderSelects();
  updateSaleHint();
}

function startSaleEdit(id) {
  const sale = findSale(id);
  if (!sale) return;

  const product = findProduct(sale.productId);
  if (!product) {
    alert("Esse produto nao esta mais no cardapio. Para editar a venda, cadastre o produto novamente.");
    return;
  }

  document.querySelector('[data-tab="sales"]').click();
  $("#saleId").value = sale.id;
  $("#saleProduct").value = sale.productId;
  $("#saleQuantity").value = sale.quantity;
  $("#salePrice").value = Number(sale.price).toFixed(2);
  $("#saleFormTitle").textContent = "Editar venda";
  $("#saleSubmit").textContent = "Salvar alteracoes";
  $("#cancelSaleEdit").classList.remove("hidden");
  updateSaleHint();
  $("#saleQuantity").focus();
}

function resetIngredientForm() {
  $("#ingredientForm").reset();
  $("#ingredientId").value = "";
  $("#ingredientStock").value = 0;
  $("#ingredientMin").value = 0;
  $("#ingredientRestockQuantity").value = 0;
  $("#ingredientRestockCost").value = 0;
  $("#ingredientFormTitle").textContent = "Novo ingrediente";
  $("#ingredientSubmit").textContent = "Adicionar ingrediente";
  $("#cancelIngredientEdit").classList.add("hidden");
}

function startIngredientEdit(id) {
  const ingredient = findIngredient(id);
  if (!ingredient) return;

  $("#ingredientId").value = ingredient.id;
  $("#ingredientName").value = ingredient.name;
  $("#ingredientUnit").value = ingredient.unit;
  $("#ingredientStock").value = ingredient.stock;
  $("#ingredientMin").value = ingredient.min;
  $("#ingredientRestockQuantity").value = 0;
  $("#ingredientRestockCost").value = 0;
  $("#ingredientFormTitle").textContent = "Editar ingrediente";
  $("#ingredientSubmit").textContent = "Salvar alteracoes";
  $("#cancelIngredientEdit").classList.remove("hidden");
  document.querySelector('[data-tab="inventory"]').click();
  $("#ingredientName").focus();
}

function startIngredientRestock(id) {
  const ingredient = findIngredient(id);
  if (!ingredient) return;

  document.querySelector('[data-tab="purchases"]').click();
  $("#purchaseIngredient").value = ingredient.id;
  $("#purchaseQuantity").focus();
}

function deleteIngredient(id) {
  const ingredient = findIngredient(id);
  if (!ingredient) return;

  const linkedProducts = state.products.filter((product) =>
    product.recipe.some((line) => line.ingredientId === ingredient.id),
  );
  const linkedNames = linkedProducts.map((product) => product.name).join(", ");
  const message = linkedProducts.length
    ? `Excluir "${ingredient.name}" tambem vai remover essa materia-prima da ficha tecnica de: ${linkedNames}. Deseja continuar?`
    : `Deseja excluir "${ingredient.name}" do estoque?`;

  if (!confirm(message)) return;

  state.ingredients = state.ingredients.filter((item) => item.id !== ingredient.id);
  state.products = state.products.map((product) => ({
    ...product,
    recipe: product.recipe.filter((line) => line.ingredientId !== ingredient.id),
  }));

  if ($("#ingredientId").value === ingredient.id) resetIngredientForm();

  saveState();
  renderAll();
}

function deleteProduct(id) {
  const product = findProduct(id);
  if (!product) return;

  if (!confirm(`Deseja excluir "${product.name}" do cardapio? As vendas antigas continuam no historico.`)) return;

  state.products = state.products.filter((item) => item.id !== product.id);
  saveState();
  renderAll();
}

function hasIngredientNameConflict(name, currentId = "") {
  return state.ingredients.some(
    (item) => item.id !== currentId && item.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
}

function availableForProduct(product) {
  if (!product || !product.recipe.length) return 0;

  return Math.min(
    ...product.recipe.map((line) => {
      const ingredient = findIngredient(line.ingredientId);
      if (!ingredient) return 0;
      return Math.floor(ingredient.stock / line.quantity);
    }),
  );
}

function updateSaleHint() {
  const product = findProduct($("#saleProduct").value);
  const impact = $("#saleStockImpact");
  if (!product) {
    $("#saleHint").textContent = "Cadastre um hamburguer antes de vender.";
    if (impact) impact.innerHTML = "<li>Nenhuma baixa prevista.</li>";
    return;
  }

  const quantity = Number($("#saleQuantity").value) || 1;
  $("#saleHint").textContent = `Disponivel pelo estoque atual: ${availableForProduct(product)} unidade(s).`;

  if (!impact) return;

  impact.innerHTML =
    product.recipe
      .map((line) => {
        const ingredient = findIngredient(line.ingredientId);
        if (!ingredient) return "";
        return `<li>${formatQuantity(line.quantity * quantity, ingredient.unit)} de ${escapeHtml(ingredient.name)}</li>`;
      })
      .filter(Boolean)
      .join("") || "<li>Esse produto nao possui ficha tecnica.</li>";
}

function canSell(product, quantity) {
  if (!product.recipe.length) return false;

  return product.recipe.every((line) => {
    const ingredient = findIngredient(line.ingredientId);
    return ingredient && ingredient.stock >= line.quantity * quantity;
  });
}

function createRecipeSnapshot(product) {
  return product.recipe.map((line) => ({
    ingredientId: line.ingredientId,
    quantity: line.quantity,
  }));
}

function getSaleRecipe(sale) {
  if (sale.recipeSnapshot?.length) return sale.recipeSnapshot;
  return findProduct(sale.productId)?.recipe || [];
}

function restoreSaleStock(sale) {
  getSaleRecipe(sale).forEach((line) => {
    const ingredient = findIngredient(line.ingredientId);
    if (ingredient) ingredient.stock += line.quantity * sale.quantity;
  });
}

function deductSaleStock(sale) {
  getSaleRecipe(sale).forEach((line) => {
    const ingredient = findIngredient(line.ingredientId);
    if (ingredient) ingredient.stock -= line.quantity * sale.quantity;
  });
}

function deductProductStock(product, quantity) {
  product.recipe.forEach((line) => {
    const ingredient = findIngredient(line.ingredientId);
    if (ingredient) ingredient.stock -= line.quantity * quantity;
  });
}

function bindEvents() {
  $$(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".tab-button").forEach((item) => item.classList.remove("active"));
      $$(".tab-panel").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      $(`#${button.dataset.tab}`).classList.add("active");
    });
  });

  $("#ingredientForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const ingredientId = $("#ingredientId").value;
    const name = $("#ingredientName").value.trim();
    const unit = $("#ingredientUnit").value;
    const stock = Number($("#ingredientStock").value);
    const min = Number($("#ingredientMin").value);
    const restockQuantity = Number($("#ingredientRestockQuantity").value);
    const restockCost = Number($("#ingredientRestockCost").value);

    if (hasIngredientNameConflict(name, ingredientId)) {
      alert("Ja existe uma materia-prima com esse nome. Edite o item existente ou escolha outro nome.");
      return;
    }

    if ((restockQuantity > 0 && restockCost <= 0) || (restockCost > 0 && restockQuantity <= 0)) {
      alert("Para registrar investimento, informe a quantidade comprada e o valor pago.");
      return;
    }

    let ingredient;
    if (ingredientId) {
      ingredient = findIngredient(ingredientId);
      if (!ingredient) return;
      ingredient.name = name;
      ingredient.unit = unit;
      ingredient.stock = stock;
      ingredient.min = min;
    } else {
      ingredient = {
        id: createId(),
        name,
        unit,
        stock,
        min,
      };
      state.ingredients.push(ingredient);
    }

    if (restockQuantity > 0) registerPurchase(ingredient, restockQuantity, restockCost);

    resetIngredientForm();
    saveState();
    renderAll();
  });

  $("#cancelIngredientEdit").addEventListener("click", resetIngredientForm);

  $("#purchaseForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const ingredient = findIngredient($("#purchaseIngredient").value);
    if (!ingredient) return;

    const quantity = Number($("#purchaseQuantity").value);
    const cost = Number($("#purchaseCost").value);
    registerPurchase(ingredient, quantity, cost);
    event.currentTarget.reset();
    saveState();
    renderAll();
  });

  $("#addRecipeLine").addEventListener("click", () => addRecipeLine());

  $("#productForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const recipe = getRecipeLinesFromForm();

    if (!recipe.length) {
      alert("Adicione pelo menos um ingrediente na receita.");
      return;
    }

    state.products.push({
      id: createId(),
      name: $("#productName").value.trim(),
      price: Number($("#productPrice").value),
      recipe,
    });
    event.currentTarget.reset();
    $("#recipeLines").innerHTML = "";
    addRecipeLine();
    saveState();
    renderAll();
  });

  $("#saleProduct").addEventListener("change", () => {
    const product = findProduct($("#saleProduct").value);
    $("#salePrice").value = product ? product.price.toFixed(2) : "";
    updateSaleHint();
  });

  $("#saleQuantity").addEventListener("input", updateSaleHint);

  $("#saleForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const saleId = $("#saleId").value;
    const saleBeingEdited = saleId ? findSale(saleId) : null;
    const product = findProduct($("#saleProduct").value);
    const quantity = Number($("#saleQuantity").value);
    const price = Number($("#salePrice").value);
    if (!product || quantity <= 0) return;

    if (saleBeingEdited) restoreSaleStock(saleBeingEdited);

    if (!canSell(product, quantity)) {
      if (saleBeingEdited) deductSaleStock(saleBeingEdited);
      $("#saleHint").textContent = "Estoque insuficiente para essa venda.";
      return;
    }

    deductProductStock(product, quantity);

    if (saleBeingEdited) {
      saleBeingEdited.productId = product.id;
      saleBeingEdited.productName = product.name;
      saleBeingEdited.quantity = quantity;
      saleBeingEdited.price = price;
      saleBeingEdited.total = quantity * price;
      saleBeingEdited.recipeSnapshot = createRecipeSnapshot(product);
      saleBeingEdited.updatedAt = new Date().toISOString();
    } else {
      state.sales.push({
        id: createId(),
        productId: product.id,
        productName: product.name,
        quantity,
        price,
        total: quantity * price,
        date: new Date().toISOString(),
        recipeSnapshot: createRecipeSnapshot(product),
      });
    }

    resetSaleForm();
    saveState();
    renderAll();
  });

  $("#cancelSaleEdit").addEventListener("click", resetSaleForm);

  $("#seedData").addEventListener("click", () => {
    state = clone(exampleState);
    saveState();
    $("#recipeLines").innerHTML = "";
    addRecipeLine();
    renderAll();
  });

  $("#clearData").addEventListener("click", () => {
    if (!confirm("Deseja apagar todos os dados cadastrados?")) return;
    state = clone(defaultState);
    localStorage.removeItem(STORAGE_KEY);
    $("#recipeLines").innerHTML = "";
    addRecipeLine();
    renderAll();
  });
}

bindEvents();
addRecipeLine();
renderAll();
