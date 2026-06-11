const { dashboardService } = require("../services/dashboard.service");

const dashboardController = {
  summary: async (_req, res) => res.json({ summary: await dashboardService.summary() }),
};

module.exports = { dashboardController };
