const { z } = require("zod");
const { query, transaction } = require("../database/pool");
const { inventoryService } = require("./inventory.service");

const saleSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
});

const saleService = {
  async list() {
    const result = await query("select * from sales order by created_at desc");
    return result.rows;
  },

  async create(input, userId) {
    const data = saleSchema.parse(input);
    return transaction(async (client) => {
      const total = data.quantity * data.unit_price;
      const sale = await client.query(
        `insert into sales (product_id, quantity, unit_price, total, source, created_by)
         values ($1, $2, $3, $4, 'manual', $5)
         returning *`,
        [data.product_id, data.quantity, data.unit_price, total, userId],
      );

      await inventoryService.consumeRecipe(client, data.product_id, data.quantity, "sale", sale.rows[0].id, userId);
      return sale.rows[0];
    });
  },
};

module.exports = { saleService };
