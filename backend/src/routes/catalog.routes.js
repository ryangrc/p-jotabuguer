const { Router } = require("express");
const { catalogController } = require("../controllers/catalog.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = Router();

router.use(requireAuth);
router.get("/categories", asyncHandler(catalogController.listCategories));
router.post("/categories", requireRole("admin"), asyncHandler(catalogController.createCategory));
router.patch("/categories/:id", requireRole("admin"), asyncHandler(catalogController.updateCategory));
router.delete("/categories/:id", requireRole("admin"), asyncHandler(catalogController.removeCategory));

router.get("/products", asyncHandler(catalogController.listProducts));
router.post("/products", requireRole("admin"), asyncHandler(catalogController.createProduct));
router.patch("/products/:id", requireRole("admin"), asyncHandler(catalogController.updateProduct));
router.delete("/products/:id", requireRole("admin"), asyncHandler(catalogController.removeProduct));

module.exports = router;
