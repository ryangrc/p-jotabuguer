const { randomBytes } = require("node:crypto");

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3333),
  databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/pjotabuguer",
  jwtSecret: process.env.JWT_SECRET || randomBytes(48).toString("hex"),
  setupToken: process.env.SETUP_TOKEN || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:8080,http://127.0.0.1:8080")
    .split(",")
    .map((origin) => origin.trim()),
};

if (env.nodeEnv === "production" && (!process.env.JWT_SECRET || Buffer.byteLength(env.jwtSecret) < 32 || /troque|desenvolvimento/i.test(env.jwtSecret))) {
  throw new Error("Configure JWT_SECRET com um segredo aleatorio de pelo menos 32 bytes.");
}

module.exports = { env };
