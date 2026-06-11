const { Router } = require("express");
const { inventoryController } = require("../controllers/inventory.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = Router();

router.use(requireAuth);
router.get("/ingredients", asyncHandler(inventoryController.listIngredients));
router.post("/ingredients", requireRole("admin"), asyncHandler(inventoryController.createIngredient));
router.patch("/ingredients/:id", requireRole("admin"), asyncHandler(inventoryController.updateIngredient));
router.delete("/ingredients/:id", requireRole("admin"), asyncHandler(inventoryController.removeIngredient));
router.get("/products/:productId/recipe", asyncHandler(inventoryController.listRecipe));
router.put("/products/:productId/recipe", requireRole("admin"), asyncHandler(inventoryController.saveRecipe));
router.post("/purchases", requireRole("admin"), asyncHandler(inventoryController.createPurchase));

module.exports = router;
