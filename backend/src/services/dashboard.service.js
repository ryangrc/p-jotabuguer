const { query } = require("../database/pool");

const dashboardService = {
  async summary() {
    const result = await query(`
      select
        coalesce((select sum(total) from sales where created_at::date = current_date), 0)::numeric as revenue_today,
        coalesce((select sum(total_cost) from purchases where created_at::date = current_date), 0)::numeric as purchases_today,
        coalesce((select count(*) from orders where status not in ('payment_confirmed', 'canceled')), 0)::int as open_orders,
        coalesce((select count(*) from ingredients where stock <= min_stock), 0)::int as low_stock_items
    `);
    return result.rows[0];
  },
};

module.exports = { dashboardService };
