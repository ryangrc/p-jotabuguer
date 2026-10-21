const { Router } = require("express");
const { authController } = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = Router();
const { rateLimit } = require("express-rate-limit");
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });

router.post("/setup", loginLimiter, asyncHandler(authController.setup));
router.post("/login", loginLimiter, asyncHandler(authController.login));
router.get("/me", requireAuth, asyncHandler(authController.me));

module.exports = router;
