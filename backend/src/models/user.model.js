const { query } = require("../database/pool");

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const userModel = {
  async count() {
    const result = await query("select count(*)::int as total from users");
    return result.rows[0].total;
  },

  async findById(id) {
    const result = await query(
      "select id, name, email, role, active, created_at, updated_at from users where id = $1",
      [id],
    );
    return mapUser(result.rows[0]);
  },

  async findByEmailWithPassword(email) {
    const result = await query("select * from users where lower(email) = lower($1)", [email]);
    return result.rows[0] || null;
  },

  async list() {
    const result = await query(
      "select id, name, email, role, active, created_at, updated_at from users order by name asc",
    );
    return result.rows.map(mapUser);
  },

  async create(data) {
    const result = await query(
      `insert into users (name, email, password_hash, role, active)
       values ($1, lower($2), $3, $4, true)
       returning id, name, email, role, active, created_at, updated_at`,
      [data.name, data.email, data.passwordHash, data.role],
    );
    return mapUser(result.rows[0]);
  },

  async update(id, data) {
    const result = await query(
      `update users
       set name = coalesce($2, name),
           email = coalesce(lower($3), email),
           role = coalesce($4, role),
           password_hash = coalesce($5, password_hash),
           active = coalesce($6, active),
           updated_at = now()
       where id = $1
       returning id, name, email, role, active, created_at, updated_at`,
      [id, data.name, data.email, data.role, data.passwordHash, data.active],
    );
    return mapUser(result.rows[0]);
  },
};

module.exports = { userModel };
