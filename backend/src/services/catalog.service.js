const { z } = require("zod");
const { createCrudService } = require("./crud.service");

const categoryService = createCrudService({
  table: "categories",
  defaultOrder: "sort_order asc, name asc",
  searchable: ["name"],
});

const productCrud = createCrudService({
  table: "products",
  defaultOrder: "sort_order asc, name asc",
  searchable: ["name", "menu_name", "category"],
});

const productSchema = z.object({
  name: z.string().trim().min(2),
  menu_name: z.string().trim().optional(),
  category: z.string().trim().optional(),
  description: z.string().trim().optional(),
  image_url: z.string().trim().optional(),
  price: z.number().nonnegative(),
  menu_active: z.boolean().optional(),
  featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const categorySchema = z.object({
  name: z.string().trim().min(2),
  sort_order: z.number().int().optional(),
});

const catalogService = {
  categories: {
    list: categoryService.list,
    create: (data) => categoryService.create(categorySchema.parse(data)),
    update: (id, data) => categoryService.update(id, categorySchema.partial().parse(data)),
    remove: categoryService.remove,
  },

  products: {
    list: productCrud.list,
    create: (data) => productCrud.create(productSchema.parse(data)),
    update: (id, data) => productCrud.update(id, productSchema.partial().parse(data)),
    remove: productCrud.remove,
  },
};

module.exports = { catalogService };
