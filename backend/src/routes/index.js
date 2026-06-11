const { Router } = require("express");

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const catalogRoutes = require("./catalog.routes");
const inventoryRoutes = require("./inventory.routes");
const orderRoutes = require("./order.routes");
const saleRoutes = require("./sale.routes");
const tableRoutes = require("./table.routes");
const dashboardRoutes = require("./dashboard.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/catalog", catalogRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/orders", orderRoutes);
router.use("/sales", saleRoutes);
router.use("/tables", tableRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
