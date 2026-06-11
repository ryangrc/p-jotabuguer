const { Router } = require("express");
const { dashboardController } = require("../controllers/dashboard.controller");
const { requireAuth } = require("../middlewares/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = Router();

router.use(requireAuth);
router.get("/summary", asyncHandler(dashboardController.summary));

module.exports = router;
