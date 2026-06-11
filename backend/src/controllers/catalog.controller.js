const { catalogService } = require("../services/catalog.service");

const catalogController = {
  listCategories: async (_req, res) => res.json({ categories: await catalogService.categories.list() }),
  createCategory: async (req, res) => res.status(201).json({ category: await catalogService.categories.create(req.body) }),
  updateCategory: async (req, res) => res.json({ category: await catalogService.categories.update(req.params.id, req.body) }),
  removeCategory: async (req, res) => res.json({ category: await catalogService.categories.remove(req.params.id) }),

  listProducts: async (req, res) => res.json({ products: await catalogService.products.list(req.query) }),
  createProduct: async (req, res) => res.status(201).json({ product: await catalogService.products.create(req.body) }),
  updateProduct: async (req, res) => res.json({ product: await catalogService.products.update(req.params.id, req.body) }),
  removeProduct: async (req, res) => res.json({ product: await catalogService.products.remove(req.params.id) }),
};

module.exports = { catalogController };
