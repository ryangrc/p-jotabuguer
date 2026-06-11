const { Router } = require("express");
const { saleController } = require("../controllers/sale.controller");
const { requireAuth } = require("../middlewares/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = Router();

router.use(requireAuth);
router.get("/", asyncHandler(saleController.list));
router.post("/", asyncHandler(saleController.create));

module.exports = router;
