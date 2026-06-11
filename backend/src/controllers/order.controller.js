const { orderService } = require("../services/order.service");

function emitOrder(req, event, order) {
  const io = req.app.get("io");
  if (io) io.emit(event, order);
}

const orderController = {
  list: async (req, res) => res.json({ orders: await orderService.list(req.query) }),
  create: async (req, res) => {
    const order = await orderService.create(req.body, req.user.id);
    emitOrder(req, "order:created", order);
    res.status(201).json({ order });
  },
  accept: async (req, res) => {
    const order = await orderService.accept(req.params.id, req.user.id);
    emitOrder(req, "order:updated", order);
    res.json({ order });
  },
  updateStatus: async (req, res) => {
    const order = await orderService.updateStatus(req.params.id, req.body.status);
    emitOrder(req, "order:updated", order);
    res.json({ order });
  },
};

module.exports = { orderController };
