const { tableService } = require("../services/table.service");

const tableController = {
  list: async (_req, res) => res.json({ tables: await tableService.list() }),
  create: async (req, res) => res.status(201).json({ table: await tableService.create(req.body) }),
  update: async (req, res) => res.json({ table: await tableService.update(req.params.id, req.body) }),
  remove: async (req, res) => res.json({ table: await tableService.remove(req.params.id) }),
};

module.exports = { tableController };
