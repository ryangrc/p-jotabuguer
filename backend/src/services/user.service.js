const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { userModel } = require("../models/user.model");
const { HttpError } = require("../utils/http-error");

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
  role: z.enum(["admin", "operator"]).default("operator"),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/).optional(),
  role: z.enum(["admin", "operator"]).optional(),
  active: z.boolean().optional(),
});

const userService = {
  async findById(id) {
    return userModel.findById(id);
  },

  async list() {
    return userModel.list();
  },

  async create(input) {
    const data = createUserSchema.parse(input);
    const existing = await userModel.findByEmailWithPassword(data.email);
    if (existing) throw new HttpError(409, "Ja existe usuario com esse email.");

    return userModel.create({
      ...data,
      passwordHash: await bcrypt.hash(data.password, 12),
    });
  },

  async update(id, input, currentUser) {
    const data = updateUserSchema.parse(input);
    const user = await userModel.findById(id);
    if (!user) throw new HttpError(404, "Usuario nao encontrado.");
    if (currentUser.id === id && data.active === false) {
      throw new HttpError(400, "Voce nao pode desativar o usuario logado.");
    }

    let passwordHash;
    if (data.password) passwordHash = await bcrypt.hash(data.password, 12);

    return userModel.update(id, { ...data, passwordHash });
  },
};

module.exports = { userService };
