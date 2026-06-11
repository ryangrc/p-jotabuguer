require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const { pool } = require("./pool");

async function migrate() {
  const filePath = path.join(__dirname, "schema.sql");
  const sql = await fs.readFile(filePath, "utf8");
  await pool.query(sql);
  await pool.end();
  console.log("Banco migrado com sucesso.");
}

migrate().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
