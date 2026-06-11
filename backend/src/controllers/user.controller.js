const { userService } = require("../services/user.service");

const userController = {
  async list(_req, res) {
    res.json({ users: await userService.list() });
  },

  async create(req, res) {
    const user = await userService.create(req.body);
    res.status(201).json({ user });
  },

  async update(req, res) {
    const user = await userService.update(req.params.id, req.body, req.user);
    res.json({ user });
  },
};

module.exports = { userController };
