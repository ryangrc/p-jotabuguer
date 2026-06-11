const { authService } = require("../services/auth.service");

const authController = {
  async setup(req, res) {
    const result = await authService.setup(req.body);
    res.status(201).json(result);
  },

  async login(req, res) {
    const result = await authService.login(req.body);
    res.json(result);
  },

  async me(req, res) {
    res.json({ user: req.user });
  },
};

module.exports = { authController };
