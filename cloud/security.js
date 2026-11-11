const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const token = () => crypto.randomBytes(32).toString('hex');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
function ensure(condition, message, status = 400) {
  if (!condition) throw Object.assign(new Error(message), { status });
}
const password = z.string().min(10, 'Use pelo menos 10 caracteres.').max(72).regex(/[a-zA-Z]/).regex(/[0-9]/).refine(v => Buffer.byteLength(v) <= 72, 'Senha muito longa.');
const email = z.string().trim().toLowerCase().email().max(254);
const profile = z.object({ name: z.string().trim().min(2).max(100), email, role: z.enum(['admin', 'operator']).default('operator') });
const publicFields = 'id,name,email,role,active,created_at AS "createdAt"';
async function throttle(db, key, max) {
  const result = await db.query(`INSERT INTO cloud_limits(key,count,until_at) VALUES($1,1,now()+interval '15 minutes')
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN cloud_limits.until_at<=now() THEN 1 ELSE cloud_limits.count+1 END,
    until_at=CASE WHEN cloud_limits.until_at<=now() THEN now()+interval '15 minutes' ELSE cloud_limits.until_at END RETURNING count`, [digest(key)]);
  ensure(result.rows[0].count <= max, 'Muitas tentativas. Aguarde 15 minutos.', 429);
}
function cookieValue(req) {
  return (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('pj_session='))?.slice(11) || '';
}
function cookie(value, secure, clear = false) {
  return `pj_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 28800}${secure ? '; Secure' : ''}`;
}
async function authenticate(db, req) {
  const value = cookieValue(req);
  ensure(/^[a-f0-9]{64}$/.test(value), 'Entre para continuar.', 401);
  const result = await db.query(`SELECT u.id,u.name,u.email,u.role,u.active,s.csrf,s.hash
    FROM cloud_sessions s JOIN cloud_users u ON u.id=s.user_id WHERE s.hash=$1 AND s.expires_at>now() AND u.active=true`, [digest(value)]);
  const user = result.rows[0];
  ensure(user, 'Sua sessão expirou. Entre novamente.', 401);
  if (!['GET', 'HEAD'].includes(req.method)) ensure(req.headers['x-csrf-token'] === user.csrf, 'Recarregue a página e tente novamente.', 403);
  return user;
}
async function newSession(db, id) {
  const value = token(), csrf = token();
  await db.query("INSERT INTO cloud_sessions(hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')", [digest(value), id, csrf]);
  return { value, csrf };
}
async function audit(db, userId, action, detail = '') {
  await db.query('INSERT INTO cloud_audit(id,user_id,action,detail) VALUES($1,$2,$3,$4)', [crypto.randomUUID(), userId, action, detail]);
}
function admin(user) { ensure(user.role === 'admin', 'Apenas administradores podem realizar esta operação.', 403); }
module.exports = { token, digest, ensure, password, email, profile, publicFields, throttle, cookie, authenticate, newSession, audit, admin, bcrypt };
