const { z } = require("zod");
const { query, transaction } = require("../database/pool");
const { createCrudService } = require("./crud.service");
const { HttpError } = require("../utils/http-error");

const ingredientCrud = createCrudService({
  table: "ingredients",
  defaultOrder: "name asc",
  searchable: ["name"],
});

const ingredientSchema = z.object({
  name: z.string().trim().min(2),
  unit: z.enum(["un", "g", "kg", "ml", "l"]).default("un"),
  stock: z.number().nonnegative().default(0),
  min_stock: z.number().nonnegative().default(0),
});

const purchaseSchema = z.object({
  ingredient_id: z.string().uuid(),
  quantity: z.number().positive(),
  total_cost: z.number().nonnegative(),
});

const recipeLineSchema = z.object({
  product_id: z.string().uuid(),
  ingredient_id: z.string().uuid(),
  quantity: z.number().positive(),
});

async function assertStockAvailable(client, ingredientId, quantity) {
  const result = await client.query("select stock from ingredients where id = $1 for update", [ingredientId]);
  const ingredient = result.rows[0];
  if (!ingredient) throw new HttpError(404, "Materia-prima nao encontrada.");
  if (Number(ingredient.stock) < quantity) throw new HttpError(400, "Estoque insuficiente.");
}

const inventoryService = {
  ingredients: {
    list: ingredientCrud.list,
    create: (data) => ingredientCrud.create(ingredientSchema.parse(data)),
    update: (id, data) => ingredientCrud.update(id, ingredientSchema.partial().parse(data)),
    remove: ingredientCrud.remove,
  },

  async listRecipe(productId) {
    const result = await query(
      `select pr.*, i.name as ingredient_name, i.unit
       from product_recipe_items pr
       join ingredients i on i.id = pr.ingredient_id
       where pr.product_id = $1
       order by i.name asc`,
      [productId],
    );
    return result.rows;
  },

  async saveRecipe(productId, items) {
    const parsed = z.array(recipeLineSchema.omit({ product_id: true })).parse(items);
    return transaction(async (client) => {
      await client.query("delete from product_recipe_items where product_id = $1", [productId]);
      for (const item of parsed) {
        await client.query(
          `insert into product_recipe_items (product_id, ingredient_id, quantity)
           values ($1, $2, $3)`,
          [productId, item.ingredient_id, item.quantity],
        );
      }
      return this.listRecipe(productId);
    });
  },

  async createPurchase(input, userId) {
    const data = purchaseSchema.parse(input);
    return transaction(async (client) => {
      const purchase = await client.query(
        `insert into purchases (ingredient_id, quantity, total_cost, created_by)
         values ($1, $2, $3, $4)
         returning *`,
        [data.ingredient_id, data.quantity, data.total_cost, userId],
      );

      await client.query("update ingredients set stock = stock + $2, updated_at = now() where id = $1", [
        data.ingredient_id,
        data.quantity,
      ]);

      await client.query(
        `insert into stock_movements (ingredient_id, type, quantity, source, source_id, created_by)
         values ($1, 'in', $2, 'purchase', $3, $4)`,
        [data.ingredient_id, data.quantity, purchase.rows[0].id, userId],
      );

      return purchase.rows[0];
    });
  },

  async consumeRecipe(client, productId, quantity, source, sourceId, userId) {
    const recipe = await client.query("select * from product_recipe_items where product_id = $1", [productId]);
    if (!recipe.rows.length) throw new HttpError(400, "Produto sem ficha tecnica cadastrada.");

    for (const line of recipe.rows) {
      await assertStockAvailable(client, line.ingredient_id, Number(line.quantity) * quantity);
    }

    for (const line of recipe.rows) {
      const total = Number(line.quantity) * quantity;
      await client.query("update ingredients set stock = stock - $2, updated_at = now() where id = $1", [
        line.ingredient_id,
        total,
      ]);
      await client.query(
        `insert into stock_movements (ingredient_id, type, quantity, source, source_id, created_by)
         values ($1, 'out', $2, $3, $4, $5)`,
        [line.ingredient_id, total, source, sourceId, userId],
      );
    }
  },
};

module.exports = { inventoryService };
