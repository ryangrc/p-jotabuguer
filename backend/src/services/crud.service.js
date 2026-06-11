const { query } = require("../database/pool");
const { HttpError } = require("../utils/http-error");

function createCrudService({ table, defaultOrder = "created_at desc", searchable = [] }) {
  return {
    async list(filters = {}) {
      const params = [];
      const where = [];

      if (filters.q && searchable.length) {
        params.push(`%${filters.q}%`);
        where.push(`(${searchable.map((field) => `${field} ilike $${params.length}`).join(" or ")})`);
      }

      const sql = `select * from ${table} ${where.length ? `where ${where.join(" and ")}` : ""} order by ${defaultOrder}`;
      const result = await query(sql, params);
      return result.rows;
    },

    async findById(id) {
      const result = await query(`select * from ${table} where id = $1`, [id]);
      return result.rows[0] || null;
    },

    async create(data) {
      const keys = Object.keys(data).filter((key) => data[key] !== undefined);
      const columns = keys.join(", ");
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
      const values = keys.map((key) => data[key]);
      const result = await query(
        `insert into ${table} (${columns}) values (${placeholders}) returning *`,
        values,
      );
      return result.rows[0];
    },

    async update(id, data) {
      const keys = Object.keys(data).filter((key) => data[key] !== undefined);
      if (!keys.length) throw new HttpError(400, "Nenhum campo informado para atualizacao.");
      const set = keys.map((key, index) => `${key} = $${index + 2}`).join(", ");
      const values = [id, ...keys.map((key) => data[key])];
      const result = await query(
        `update ${table} set ${set}, updated_at = now() where id = $1 returning *`,
        values,
      );
      if (!result.rows[0]) throw new HttpError(404, "Registro nao encontrado.");
      return result.rows[0];
    },

    async remove(id) {
      const result = await query(`delete from ${table} where id = $1 returning *`, [id]);
      if (!result.rows[0]) throw new HttpError(404, "Registro nao encontrado.");
      return result.rows[0];
    },
  };
}

module.exports = { createCrudService };
