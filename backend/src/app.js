const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { env } = require("./config/env");
const routes = require("./routes");
const { errorHandler } = require("./middlewares/error-handler");

function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "pjotabuguer-api" });
  });

  app.use("/api", routes);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
