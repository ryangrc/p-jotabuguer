const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3333),
  databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/pjotabuguer",
  jwtSecret: process.env.JWT_SECRET || "desenvolvimento-altere-este-segredo",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:8080,http://127.0.0.1:8080")
    .split(",")
    .map((origin) => origin.trim()),
};

module.exports = { env };
