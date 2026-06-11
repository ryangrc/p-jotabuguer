const { inventoryService } = require("../services/inventory.service");

const inventoryController = {
  listIngredients: async (req, res) => res.json({ ingredients: await inventoryService.ingredients.list(req.query) }),
  createIngredient: async (req, res) => res.status(201).json({ ingredient: await inventoryService.ingredients.create(req.body) }),
  updateIngredient: async (req, res) => res.json({ ingredient: await inventoryService.ingredients.update(req.params.id, req.body) }),
  removeIngredient: async (req, res) => res.json({ ingredient: await inventoryService.ingredients.remove(req.params.id) }),
  listRecipe: async (req, res) => res.json({ items: await inventoryService.listRecipe(req.params.productId) }),
  saveRecipe: async (req, res) => res.json({ items: await inventoryService.saveRecipe(req.params.productId, req.body.items || []) }),
  createPurchase: async (req, res) => res.status(201).json({ purchase: await inventoryService.createPurchase(req.body, req.user.id) }),
};

module.exports = { inventoryController };
