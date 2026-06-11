const { Router } = require("express");
const { userController } = require("../controllers/user.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = Router();

router.use(requireAuth, requireRole("admin"));
router.get("/", asyncHandler(userController.list));
router.post("/", asyncHandler(userController.create));
router.patch("/:id", asyncHandler(userController.update));

module.exports = router;
