const { Router } = require("express");
const { tableController } = require("../controllers/table.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = Router();

router.use(requireAuth);
router.get("/", asyncHandler(tableController.list));
router.post("/", requireRole("admin"), asyncHandler(tableController.create));
router.patch("/:id", asyncHandler(tableController.update));
router.delete("/:id", requireRole("admin"), asyncHandler(tableController.remove));

module.exports = router;
