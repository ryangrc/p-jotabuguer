const { Router } = require("express");
const { orderController } = require("../controllers/order.controller");
const { requireAuth } = require("../middlewares/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = Router();

router.use(requireAuth);
router.get("/", asyncHandler(orderController.list));
router.post("/", asyncHandler(orderController.create));
router.post("/:id/accept", asyncHandler(orderController.accept));
router.patch("/:id/status", asyncHandler(orderController.updateStatus));

module.exports = router;
