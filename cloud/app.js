const express = require('express');
const { randomUUID, timingSafeEqual } = require('node:crypto');
const { z } = require('zod');
const { database, transaction } = require('./db');
const sec = require('./security');
const domain = require('./domain');
const history = require('./history');
const uuid = z.string().uuid();
const wrap = fn => (req,res,next) => Promise.resolve(fn(req,res)).catch(next);
function createApp(options = {}) {
  const app = express();
  const config = options.config || process.env;
  const db = () => options.db || database();
  const origin = () => config.APP_ORIGIN || 'http://localhost:8080';
  const secure = () => new URL(origin()).protocol === 'https:';
  app.disable('x-powered-by');
  app.use((req,res,next) => {
    res.set({ 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
      'X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
    if (secure()) res.set('Strict-Transport-Security','max-age=31536000');
    if (config.NODE_ENV === 'production' && (!config.APP_ORIGIN || !secure())) return res.status(503).json({error:'Configure APP_ORIGIN com HTTPS.'});
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      const allowed=new Set([origin()]);
      if(config.VERCEL_URL)allowed.add(`https://${config.VERCEL_URL}`);
      if (!allowed.has(req.headers.origin)) return res.status(403).json({error:'Origem não autorizada.'});
      if (!req.is('application/json')) return res.status(415).json({error:'Envie JSON.'});
    }
    next();
  });
  app.use(express.json({limit:'3mb'}));
  app.get('/api/health', wrap(async (_req,res) => {
    await db().query('SELECT id FROM cloud_setup LIMIT 1'); res.json({ok:true});
  }));
  app.get('/api/bootstrap', wrap(async (req,res) => {
    const initialized = (await db().query('SELECT id FROM cloud_setup LIMIT 1')).rows.length > 0;
    if (!initialized) return res.json({setup:true});
    try {
      const user = await sec.authenticate(db(),req);
      res.json({user:publicUser(user),csrf:user.csrf});
    } catch(error) { if(error.status === 401) res.json({login:true}); else throw error; }
  }));
  // Counters persist in PostgreSQL and therefore work across concurrent Vercel instances.
  app.use('/api/auth', (req,res,next) => {
    const ip = config.VERCEL ? (req.headers['x-vercel-forwarded-for'] || req.socket.remoteAddress) : req.socket.remoteAddress;
    sec.throttle(db(), `auth-ip:${ip}`, 100).then(() => next(),next);
  });
  app.post('/api/auth/setup', wrap(async (req,res) => {
    sec.ensure(config.SETUP_KEY && config.SETUP_KEY.length >= 32, 'A configuração inicial precisa de uma chave definida na hospedagem.',503);
    const supplied = sec.digest(String(req.body.setupKey || ''));
    sec.ensure(timingSafeEqual(Buffer.from(supplied),Buffer.from(sec.digest(config.SETUP_KEY))), 'Chave de configuração inválida.',403);
    const data = sec.profile.parse({...req.body,role:'admin'});
    if(config.SETUP_EMAIL)sec.ensure(data.email===config.SETUP_EMAIL.toLowerCase(),'Use o email autorizado para o primeiro acesso.',403);
    const hash = await sec.bcrypt.hash(sec.password.parse(req.body.password),12);
    const session = await transaction(db(), async client => {
      await client.query('SELECT pg_advisory_xact_lock(902102)');
      sec.ensure(!(await client.query('SELECT id FROM cloud_setup')).rows.length,'O administrador inicial já foi criado.',409);
      const userId = randomUUID();
      await client.query('INSERT INTO cloud_users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)',[userId,data.name,data.email,hash,'admin']);
      await client.query('INSERT INTO cloud_setup(id) VALUES(1)');
      await client.query('INSERT INTO cloud_store(id,data) VALUES(1,$1)',[JSON.stringify(domain.emptyState())]);
      await sec.audit(client,userId,'Configuração inicial');
      return sec.newSession(client,userId);
    });
    res.set('Set-Cookie',sec.cookie(session.value,secure())).json({ok:true,csrf:session.csrf});
  }));
  app.post('/api/auth/login', wrap(async (req,res) => {
    const email = sec.email.parse(req.body.email);
    await sec.throttle(db(),`login:${email}`,5);
    const password = z.string().max(200).parse(req.body.password);
    const record = (await db().query('SELECT * FROM cloud_users WHERE email=$1 AND active=true',[email])).rows[0];
    // Always perform a password hash comparison, including unknown accounts.
    const dummy = '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
    const valid = await sec.bcrypt.compare(password,record?.password_hash || dummy);
    if (!record || !valid) {
      await sec.audit(db(),record?.id || null,'Tentativa de login inválida');
      sec.ensure(false,'Email ou senha incorretos.',401);
    }
    const session = await transaction(db(),async client => {
      const current = (await client.query('SELECT * FROM cloud_users WHERE id=$1 FOR UPDATE',[record.id])).rows[0];
      sec.ensure(current.active && current.password_hash === record.password_hash,'Conta alterada. Entre novamente.',401);
      await client.query('DELETE FROM cloud_limits WHERE key=$1',[sec.digest(`login:${email}`)]);
      await client.query('DELETE FROM cloud_sessions WHERE expires_at<now()');
      await sec.audit(client,record.id,'Login');
      return sec.newSession(client,record.id);
    });
    res.set('Set-Cookie',sec.cookie(session.value,secure())).json({ok:true,csrf:session.csrf});
  }));
  app.post('/api/auth/forgot', wrap(async (req,res) => {
    const email = sec.email.parse(req.body.email);
    await sec.throttle(db(),`forgot:${email}`,3);
    const user = (await db().query('SELECT id FROM cloud_users WHERE email=$1 AND active=true',[email])).rows[0];
    if (user && config.RESEND_API_KEY && config.EMAIL_FROM) {
      const token = sec.token();
      await transaction(db(),async client => {
        await client.query('DELETE FROM cloud_resets WHERE user_id=$1',[user.id]);
        await client.query("INSERT INTO cloud_resets(hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",[sec.digest(token),user.id]);
      });
      try {
        const response = await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${config.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:config.EMAIL_FROM,to:[email],subject:'Recuperar acesso à PJ Burguer',text:`Defina uma nova senha em ${origin()}/#reset=${token}\nO link expira em 30 minutos e só pode ser usado uma vez.`})});
        if (!response.ok) throw new Error('mail');
      } catch {
        await db().query('DELETE FROM cloud_resets WHERE hash=$1',[sec.digest(token)]);
        await sec.audit(db(),null,'Falha no envio de recuperação');
      }
    }
    res.json({message:'Se houver uma conta e o envio de email estiver configurado, você receberá um link. Caso contrário, solicite a redefinição ao administrador.'});
  }));
  app.post('/api/auth/reset', wrap(async (req,res) => {
    const token = z.string().regex(/^[a-f0-9]{64}$/).parse(req.body.token);
    const hash = await sec.bcrypt.hash(sec.password.parse(req.body.password),12);
    await transaction(db(),async client => {
      const row = (await client.query('SELECT * FROM cloud_resets WHERE hash=$1 AND expires_at>now() FOR UPDATE',[sec.digest(token)])).rows[0];
      sec.ensure(row,'Link inválido ou expirado.');
      const user = (await client.query('SELECT * FROM cloud_users WHERE id=$1 AND active=true FOR UPDATE',[row.user_id])).rows[0];
      sec.ensure(user,'Conta indisponível.');
      await client.query('UPDATE cloud_users SET password_hash=$1 WHERE id=$2',[hash,user.id]);
      await client.query('DELETE FROM cloud_sessions WHERE user_id=$1',[user.id]);
      await client.query('DELETE FROM cloud_resets WHERE user_id=$1',[user.id]);
      await client.query('DELETE FROM cloud_limits WHERE key=$1',[sec.digest(`login:${user.email}`)]);
      await sec.audit(client,user.id,'Senha recuperada');
    });
    res.json({ok:true});
  }));
  app.use('/api', (req,res,next) => sec.authenticate(db(),req).then(user => {req.user=user;next();},next));
  app.post('/api/logout', wrap(async (req,res) => {
    await db().query('DELETE FROM cloud_sessions WHERE hash=$1',[req.user.hash]);
    res.set('Set-Cookie',sec.cookie('',secure(),true)).json({ok:true});
  }));
  app.post('/api/password', wrap(async (req,res) => {
    await sec.throttle(db(),`password:${req.user.id}`,5);
    const password = sec.password.parse(req.body.password);
    await transaction(db(),async client => {
      const record=(await client.query('SELECT * FROM cloud_users WHERE id=$1 FOR UPDATE',[req.user.id])).rows[0];
      sec.ensure(await sec.bcrypt.compare(String(req.body.current || ''),record.password_hash),'Senha atual incorreta.',403);
      await client.query('UPDATE cloud_users SET password_hash=$1 WHERE id=$2',[await sec.bcrypt.hash(password,12),record.id]);
      await client.query('DELETE FROM cloud_sessions WHERE user_id=$1',[record.id]);
      await client.query('DELETE FROM cloud_resets WHERE user_id=$1',[record.id]);
      await sec.audit(client,record.id,'Senha alterada');
    });
    res.set('Set-Cookie',sec.cookie('',secure(),true)).json({ok:true});
  }));
  async function bundle(client,user,since) {
    const row=(await client.query('SELECT revision,data FROM cloud_store WHERE id=1')).rows[0];
    const users=user.role==='admin' ? (await client.query(`SELECT ${sec.publicFields} FROM cloud_users WHERE active=true ORDER BY created_at`)).rows : [publicUser(user)];
    const result={revision:row.revision,user:publicUser(user),users,csrf:user.csrf};
    if (Number(since)!==row.revision || since==null) result.state=domain.visibleState(row.data,user);
    return result;
  }
  app.get('/api/state', wrap(async (req,res) => res.json(await bundle(db(),req.user,req.query.since))));
  app.post('/api/users', wrap(async (req,res) => {
    sec.admin(req.user);
    const data=sec.profile.parse(req.body);
    const userId=req.body.id ? uuid.parse(req.body.id) : randomUUID();
    const newHash=req.body.password ? await sec.bcrypt.hash(sec.password.parse(req.body.password),12) : null;
    await transaction(db(),async client => {
      await client.query('SELECT pg_advisory_xact_lock(902102)');
      sec.admin(await sec.authenticate(client,req));
      const existing=(await client.query('SELECT id FROM cloud_users WHERE id=$1',[userId])).rows[0];
      if(existing) {
        await client.query('UPDATE cloud_users SET name=$1,email=$2,role=$3,password_hash=COALESCE($4,password_hash) WHERE id=$5',[data.name,data.email,data.role,newHash,userId]);
        await client.query('DELETE FROM cloud_sessions WHERE user_id=$1',[userId]);
        await client.query('DELETE FROM cloud_resets WHERE user_id=$1',[userId]);
      } else {
        sec.ensure(newHash,'Informe a senha do novo usuário.');
        await client.query('INSERT INTO cloud_users(id,name,email,role,password_hash) VALUES($1,$2,$3,$4,$5)',[userId,data.name,data.email,data.role,newHash]);
      }
      sec.ensure((await client.query("SELECT id FROM cloud_users WHERE role='admin' AND active=true")).rows.length,'Mantenha pelo menos um administrador ativo.',409);
      await sec.audit(client,req.user.id,existing?'Usuário atualizado':'Usuário criado',userId);
    });
    res.json({ok:true,reauthenticate:userId===req.user.id});
  }));
  app.post('/api/users/disable', wrap(async (req,res) => {
    sec.admin(req.user); const id=uuid.parse(req.body.id);
    sec.ensure(id!==req.user.id,'Não é possível desativar seu próprio acesso.');
    await transaction(db(),async client => {
      await client.query('SELECT pg_advisory_xact_lock(902102)');
      sec.admin(await sec.authenticate(client,req));
      await client.query('UPDATE cloud_users SET active=false WHERE id=$1',[id]);
      sec.ensure((await client.query("SELECT id FROM cloud_users WHERE role='admin' AND active=true")).rows.length,'Mantenha um administrador.',409);
      await client.query('DELETE FROM cloud_sessions WHERE user_id=$1',[id]);
      await client.query('DELETE FROM cloud_resets WHERE user_id=$1',[id]);
      await sec.audit(client,req.user.id,'Usuário desativado',id);
    }); res.json({ok:true});
  }));
  app.post('/api/mutate', wrap(async (req,res) => {
    const requestId=uuid.parse(req.body.requestId), revision=z.number().int().nonnegative().parse(req.body.revision);
    const action=z.enum(['state.save','state.import','state.restore','order.create','order.accept','order.advance','order.cancel','delivery.start','delivery.finish']).parse(req.body.action);
    const hash=sec.digest(JSON.stringify(req.body));
    const response=await transaction(db(),async client => {
      // One authoritative document retains all legacy modules while serializing stock and cash writes.
      const row=(await client.query('SELECT * FROM cloud_store WHERE id=1 FOR UPDATE')).rows[0];
      const user=await sec.authenticate(client,req);
      const old=(await client.query('SELECT * FROM cloud_requests WHERE user_id=$1 AND request_id=$2',[user.id,requestId])).rows[0];
      if(old) { sec.ensure(old.digest===hash,'Identificador de operação reutilizado com outros dados.',409); return {...await bundle(client,user),...old.result,replayed:true}; }
      sec.ensure(row.revision===revision,'Outro dispositivo atualizou os dados. Recarregue e confira antes de tentar novamente.',409);
      let state=structuredClone(row.data), result={};
      if(action.startsWith('state.')) {
        sec.admin(user);
        if(action==='state.restore') {
          const target=z.number().int().nonnegative().parse(req.body.data.revision);
          sec.ensure(target<row.revision,'Escolha uma versão anterior.');
          const versions=(await client.query('SELECT revision,data FROM cloud_history WHERE revision >= $1 AND revision < $2 ORDER BY revision DESC',[target,row.revision])).rows;
          sec.ensure(versions.length===row.revision-target,'Histórico incompleto. Use um backup exportado.',409);
          for(const version of versions)state=history.rewind(state,version.data);
          state=domain.validateState(state);
        } else state=domain.validateState(req.body.data);
        // Client-provided log entries are never trusted as the server's audit trail.
        state.auditLogs=action==='state.import'
          ? state.auditLogs.map(log=>({...log,user:`[Importado] ${log.user || 'Legado'}`}))
          : structuredClone(row.data.auditLogs || []);
        domain.addAudit(state,user,action,`Versão ${row.revision+1}`);
      } else result=domain.orderAction(state,action,req.body.data,user);
      await client.query('INSERT INTO cloud_history(revision,data,actor,reason) VALUES($1,$2,$3,$4)',[row.revision,JSON.stringify(history.inverse(row.data,state)),user.id,action]);
      await client.query('UPDATE cloud_store SET revision=revision+1,data=$1,updated_at=now() WHERE id=1',[JSON.stringify(state)]);
      await sec.audit(client,user.id,action,`Versão ${row.revision} → ${row.revision+1}`);
      await client.query('INSERT INTO cloud_requests(user_id,request_id,digest,result) VALUES($1,$2,$3,$4)',[user.id,requestId,hash,JSON.stringify(result)]);
      return {...await bundle(client,user),...result};
    }); res.json(response);
  }));
  app.get('/api/backup',wrap(async (req,res) => {
    sec.admin(req.user); const row=(await db().query('SELECT * FROM cloud_store WHERE id=1')).rows[0];
    res.set('Content-Disposition',`attachment; filename="pjotabuguer-v${row.revision}.json"`).json(row.data);
  }));
  app.get('/api/history',wrap(async(req,res)=>{
    sec.admin(req.user);
    res.json((await db().query('SELECT revision,reason,created_at FROM cloud_history ORDER BY revision DESC LIMIT 100')).rows);
  }));
  app.get('/api/audit',wrap(async(req,res)=>{
    sec.admin(req.user);
    res.json((await db().query('SELECT a.id,a.action,a.detail,a.created_at,u.name FROM cloud_audit a LEFT JOIN cloud_users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 500')).rows);
  }));
  app.use('/api',(_req,res)=>res.status(404).json({error:'Rota não encontrada.'}));
  app.use((error,_req,res,_next)=>{
    if(error instanceof z.ZodError) return res.status(400).json({error:'Dados inválidos. Confira os campos.',fields:error.issues.map(i=>({path:i.path.join('.'),message:i.message}))});
    if(error.code==='23505') return res.status(409).json({error:'Este registro já existe.'});
    if(error.type==='entity.too.large') return res.status(413).json({error:'Dados excedem 3 MB. Contate o administrador para uma migração assistida.'});
    if(error instanceof SyntaxError && error.status===400) return res.status(400).json({error:'JSON inválido.'});
    res.status(error.status || 500).json({error:error.status ? error.message : 'Não foi possível concluir a operação. Nenhuma confirmação de gravação foi emitida.'});
  });
  return app;
}
function publicUser(user) { return {id:user.id,name:user.name,email:user.email,role:user.role,active:user.active}; }
module.exports={createApp};
