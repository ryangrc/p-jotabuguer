const { z } = require("zod");
const { createCrudService } = require("./crud.service");

const tableCrud = createCrudService({
  table: "restaurant_tables",
  defaultOrder: "number asc",
  searchable: ["label"],
});

const tableSchema = z.object({
  number: z.number().int().positive(),
  label: z.string().trim().optional(),
  status: z.enum(["available", "occupied", "reserved", "closed"]).default("available"),
});

const tableService = {
  list: tableCrud.list,
  create: (data) => tableCrud.create(tableSchema.parse(data)),
  update: (id, data) => tableCrud.update(id, tableSchema.partial().parse(data)),
  remove: tableCrud.remove,
};

module.exports = { tableService };
