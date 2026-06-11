const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { env } = require("../config/env");
const { userModel } = require("../models/user.model");
const { userService } = require("./user.service");
const { HttpError } = require("../utils/http-error");

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const setupSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
});

function signToken(user) {
  return jwt.sign({ role: user.role, email: user.email }, env.jwtSecret, {
    subject: user.id,
    expiresIn: env.jwtExpiresIn,
  });
}

const authService = {
  async setup(input) {
    const total = await userModel.count();
    if (total > 0) throw new HttpError(409, "Administrador inicial ja foi criado.");

    const data = setupSchema.parse(input);
    const user = await userService.create({ ...data, role: "admin" });
    return { user, token: signToken(user) };
  },

  async login(input) {
    const data = loginSchema.parse(input);
    const userRecord = await userModel.findByEmailWithPassword(data.email);

    if (!userRecord || !userRecord.active) {
      throw new HttpError(401, "Email ou senha incorretos.");
    }

    const matches = await bcrypt.compare(data.password, userRecord.password_hash);
    if (!matches) throw new HttpError(401, "Email ou senha incorretos.");

    const user = await userModel.findById(userRecord.id);
    return { user, token: signToken(user) };
  },
};

module.exports = { authService };
