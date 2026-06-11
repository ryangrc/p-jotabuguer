const { saleService } = require("../services/sale.service");

const saleController = {
  list: async (_req, res) => res.json({ sales: await saleService.list() }),
  create: async (req, res) => res.status(201).json({ sale: await saleService.create(req.body, req.user.id) }),
};

module.exports = { saleController };
