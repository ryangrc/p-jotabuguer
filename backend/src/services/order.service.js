const { z } = require("zod");
const { query, transaction } = require("../database/pool");
const { HttpError } = require("../utils/http-error");
const { inventoryService } = require("./inventory.service");

const orderStatuses = [
  "awaiting_acceptance",
  "in_production",
  "ready",
  "dispatching",
  "payment_confirmed",
  "canceled",
];

const orderSchema = z.object({
  customer_name: z.string().trim().optional(),
  destination: z.enum(["delivery", "table", "pickup"]).default("delivery"),
  table_id: z.string().uuid().optional().nullable(),
  note: z.string().trim().optional(),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().int().positive(),
      unit_price: z.number().nonnegative(),
      note: z.string().trim().optional(),
    }),
  ).min(1),
});

async function getOrder(id) {
  const order = await query("select * from orders where id = $1", [id]);
  if (!order.rows[0]) return null;
  const items = await query("select * from order_items where order_id = $1 order by created_at asc", [id]);
  return { ...order.rows[0], items: items.rows };
}

const orderService = {
  async list(filters = {}) {
    const params = [];
    const where = [];

    if (filters.status) {
      params.push(filters.status);
      where.push(`status = $${params.length}`);
    }

    const result = await query(
      `select * from orders ${where.length ? `where ${where.join(" and ")}` : ""} order by created_at desc`,
      params,
    );
    return result.rows;
  },

  async create(input, userId) {
    const data = orderSchema.parse(input);
    return transaction(async (client) => {
      const total = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const order = await client.query(
        `insert into orders (customer_name, destination, table_id, note, status, total, created_by)
         values ($1, $2, $3, $4, 'awaiting_acceptance', $5, $6)
         returning *`,
        [data.customer_name || "", data.destination, data.table_id || null, data.note || "", total, userId],
      );

      for (const item of data.items) {
        await client.query(
          `insert into order_items (order_id, product_id, quantity, unit_price, note)
           values ($1, $2, $3, $4, $5)`,
          [order.rows[0].id, item.product_id, item.quantity, item.unit_price, item.note || ""],
        );
      }

      return getOrder(order.rows[0].id);
    });
  },

  async accept(id, userId) {
    return transaction(async (client) => {
      const order = await client.query("select * from orders where id = $1 for update", [id]);
      if (!order.rows[0]) throw new HttpError(404, "Pedido nao encontrado.");
      if (order.rows[0].status !== "awaiting_acceptance") {
        throw new HttpError(400, "Pedido nao esta aguardando aceite.");
      }

      const items = await client.query("select * from order_items where order_id = $1", [id]);
      for (const item of items.rows) {
        await inventoryService.consumeRecipe(client, item.product_id, Number(item.quantity), "order", id, userId);
      }

      await client.query(
        `update orders
         set status = 'in_production', accepted_at = now(), status_updated_at = now(), updated_at = now()
         where id = $1`,
        [id],
      );

      return getOrder(id);
    });
  },

  async updateStatus(id, status) {
    if (!orderStatuses.includes(status)) throw new HttpError(400, "Status de pedido invalido.");
    const result = await query(
      `update orders
       set status = $2,
           ready_at = case when $2 = 'ready' then now() else ready_at end,
           dispatched_at = case when $2 = 'dispatching' then now() else dispatched_at end,
           paid_at = case when $2 = 'payment_confirmed' then now() else paid_at end,
           status_updated_at = now(),
           updated_at = now()
       where id = $1
       returning *`,
      [id, status],
    );
    if (!result.rows[0]) throw new HttpError(404, "Pedido nao encontrado.");
    return getOrder(id);
  },
};

module.exports = { orderService };
