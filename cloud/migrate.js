require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { database, transaction } = require('./db');
async function migrate(db) {
  await transaction(db, async client => {
    await client.query("SELECT pg_advisory_xact_lock(902101)");
    await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  });
}
if (require.main === module) {
  const db = database();
  migrate(db).then(() => console.log('Estrutura criada. Nenhum dado existente foi substituído.'))
    .catch(() => { console.error('Migração falhou. Verifique conexão e permissões do banco.'); process.exitCode = 1; })
    .finally(() => db.end());
}
module.exports = { migrate };
