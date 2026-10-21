const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { env } = require("../config/env");
const { userModel } = require("../models/user.model");
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
    algorithm: "HS256",
    subject: user.id,
    expiresIn: env.jwtExpiresIn,
  });
}

const authService = {
  async setup(input, setupToken) {
    const { timingSafeEqual } = require("node:crypto");
    const supplied = Buffer.from(typeof setupToken === "string" ? setupToken : "");
    const expected = Buffer.from(env.setupToken);
    if (!expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new HttpError(403, "Configuracao inicial nao autorizada.");
    }
    const total = await userModel.count();
    if (total > 0) throw new HttpError(409, "Administrador inicial ja foi criado.");

    const data = setupSchema.parse(input);
    const user = await userModel.createInitialAdmin({ ...data, passwordHash: await bcrypt.hash(data.password, 12) });
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
