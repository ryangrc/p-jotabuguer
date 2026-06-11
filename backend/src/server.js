require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const { createApp } = require("./app");
const { env } = require("./config/env");

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.corsOrigin,
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  socket.emit("connected", { ok: true });
});

server.listen(env.port, () => {
  console.log(`API Pjotabuguer rodando em http://localhost:${env.port}`);
});
