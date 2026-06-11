const { Router } = require("express");
const { authController } = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = Router();

router.post("/setup", asyncHandler(authController.setup));
router.post("/login", asyncHandler(authController.login));
router.get("/me", requireAuth, asyncHandler(authController.me));

module.exports = router;
