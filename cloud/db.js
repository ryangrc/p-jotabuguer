const { Pool } = require('pg');
let pool;
function database() {
  if (!process.env.DATABASE_URL) throw Object.assign(new Error('Configure o banco de dados do servidor.'), { status: 503 });
  if (!pool) {
    const url=new URL(process.env.DATABASE_URL);
    if(!['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname))url.searchParams.set('sslmode','verify-full');
    pool = new Pool({ connectionString: url.href, max: 3, idleTimeoutMillis: 5000, connectionTimeoutMillis: 10000 });
    if (process.env.VERCEL) require('@vercel/functions').attachDatabasePool(pool);
    pool.on('error', () => console.error('Falha de conexão com PostgreSQL.'));
  }
  return pool;
}
async function transaction(db, fn) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
module.exports = { database, transaction };
