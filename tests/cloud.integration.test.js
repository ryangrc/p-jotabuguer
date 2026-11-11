const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {Pool}=require('pg');
const request=require('supertest');
const {createApp}=require('../cloud/app');
const {migrate}=require('../cloud/migrate');
const {emptyState}=require('../cloud/domain');
const {digest}=require('../cloud/security');
test('PostgreSQL real: autenticação, permissões, concorrência e recuperação', {skip:!process.env.TEST_DATABASE_URL}, async t=>{
 const url=new URL(process.env.TEST_DATABASE_URL);
 assert.ok(['127.0.0.1','localhost'].includes(url.hostname),'Testes só usam PostgreSQL local isolado.');
 const schema='test_'+randomUUID().replace(/-/g,'');
 const root=new Pool({connectionString:url.href});
 await root.query(`CREATE SCHEMA ${schema}`);
 const db=new Pool({connectionString:url.href,options:`-c search_path=${schema}`,max:6});
 await migrate(db);
 const config={APP_ORIGIN:'https://pj.test',SETUP_KEY:randomUUID()+randomUUID(),NODE_ENV:'production'};
 const app=createApp({db,config});
 const secret='Teste-'+randomUUID()+'9';
 const client=()=>({cookie:'',csrf:'',async call(path,data,headers={}){
   let r=data===undefined?request(app).get(path):request(app).post(path).send(data);
   r=r.set('Origin',config.APP_ORIGIN).set('Cookie',this.cookie).set('X-CSRF-Token',this.csrf);
   for(const [k,v] of Object.entries(headers))r=r.set(k,v);
   const result=await r;
   if(result.headers['set-cookie'])this.cookie=result.headers['set-cookie'][0].split(';')[0];
   if(result.body.csrf)this.csrf=result.body.csrf;
   return result;
 }});
 const admin=client(),device=client(),operator=client(),guest=client();
 let revision=0,adminId,opId,orderId;
 const mutation=(action,data,rev=revision)=>({requestId:randomUUID(),revision:rev,action,data});
 try {
  await t.test('setup protegido, atômico e cookie seguro',async()=>{
   assert.equal((await guest.call('/api/state')).status,401);
   assert.equal((await admin.call('/api/auth/setup',{name:'Dono',email:'owner@example.test',password:secret,setupKey:'wrong'})).status,403);
   const result=await admin.call('/api/auth/setup',{name:'Dono',email:'owner@example.test',password:secret,setupKey:config.SETUP_KEY});
   assert.equal(result.status,200,JSON.stringify(result.body));
   for(const flag of ['HttpOnly','Secure','SameSite=Strict'])assert.ok(result.headers['set-cookie'][0].includes(flag));
   assert.equal((await guest.call('/api/auth/setup',{name:'Intruso',email:'other@example.test',password:secret,setupKey:config.SETUP_KEY})).status,409);
   adminId=(await admin.call('/api/state')).body.user.id;
  });
  await t.test('CSRF e origem são obrigatórios; último administrador é preservado',async()=>{
   assert.equal((await admin.call('/api/mutate',mutation('state.save',emptyState()),{'X-CSRF-Token':'wrong'})).status,403);
   assert.equal((await admin.call('/api/mutate',mutation('state.save',emptyState()),{Origin:'https://evil.test'})).status,403);
   assert.equal((await admin.call('/api/users',{id:adminId,name:'Dono',email:'owner@example.test',role:'operator'})).status,409);
   assert.equal((await admin.call('/api/state')).status,200,'Rollback também preserva a sessão.');
  });
  await t.test('migração preserva módulos e dois dispositivos recebem o mesmo banco',async()=>{
   const state=emptyState();
   state.ingredients=[{id:'bread',name:'Pão',unit:'un',stock:10,min:2}];
   state.products=[{id:'burger',name:'Hambúrguer',price:20,menuActive:true,recipe:[{ingredientId:'bread',quantity:2}]}];
   state.purchases=[{id:'buy1',ingredientId:'bread',quantity:10,cost:30,date:new Date().toISOString()}];
   state.expenses=[{id:'expense1',amount:5,description:'Embalagens',date:new Date().toISOString()}];
   state.cashClosings=[{id:'cash1',status:'closed',date:new Date().toISOString()}];
   let r=await admin.call('/api/mutate',mutation('state.import',state));assert.equal(r.status,200,JSON.stringify(r.body));revision=r.body.revision;
   assert.equal((await device.call('/api/auth/login',{email:'owner@example.test',password:secret})).status,200);
   const read=await device.call('/api/state');assert.equal(read.body.revision,revision);assert.equal(read.body.state.ingredients[0].stock,10);assert.equal(read.body.state.expenses[0].amount,5);
   const backup=await admin.call('/api/backup');assert.equal(backup.body.cashClosings[0].id,'cash1');
  });
  await t.test('operador não altera usuários, catálogo, auditoria nem backup',async()=>{
   assert.equal((await admin.call('/api/users',{name:'Operador',email:'op@example.test',role:'operator',password:secret})).status,200);
   opId=(await admin.call('/api/state')).body.users.find(u=>u.role==='operator').id;
   assert.equal((await operator.call('/api/auth/login',{email:'op@example.test',password:secret})).status,200);
   assert.equal((await operator.call('/api/users',{name:'Novo admin',email:'bad@example.test',role:'admin',password:secret})).status,403);
   assert.equal((await operator.call('/api/mutate',mutation('state.save',emptyState()))).status,403);
   assert.equal((await operator.call('/api/backup')).status,403);
   assert.equal((await operator.call('/api/audit')).status,403);
   const r=await operator.call('/api/state');assert.deepEqual(r.body.state.purchases,[]);assert.deepEqual(r.body.state.auditLogs,[]);
   assert.ok(!JSON.stringify(r.body).includes('password_hash'));
  });
  const order={items:[{productId:'burger',quantity:1}],customerName:'Cliente teste',customerPhone:'11999990000',destination:'pickup',paymentMethod:'pix',deliveryFee:3,discount:1,surcharge:0};
  await t.test('pedido é calculado no servidor e retry não duplica estoque nem venda',async()=>{
   const forged={...order,items:[{productId:'burger',quantity:1,price:0.01}]};
   assert.equal((await operator.call('/api/mutate',mutation('order.create',forged))).status,400);
   const payload=mutation('order.create',order);
   const created=await operator.call('/api/mutate',payload);assert.equal(created.status,200,JSON.stringify(created.body));revision=created.body.revision;orderId=created.body.orderId;
   const retry=await operator.call('/api/mutate',payload);assert.equal(retry.status,200);assert.equal(retry.body.replayed,true);assert.equal(retry.body.orderId,orderId);
   assert.equal((await operator.call('/api/mutate',{...payload,data:{...order,customerName:'Alterado'}})).status,409);
   const s=(await admin.call('/api/state')).body.state;
   assert.equal(s.ingredients[0].stock,8);assert.equal(s.orders.length,1);assert.equal(s.sales.length,1);assert.equal(s.sales[0].total,22);assert.equal(s.orders[0].total,22);assert.equal(s.customers[0].orderCount,1);
  });
  await t.test('gravações concorrentes: uma confirma e outra recebe conflito sem sobrescrever',async()=>{
   const results=await Promise.all([operator.call('/api/mutate',mutation('order.create',order)),device.call('/api/mutate',mutation('order.create',order))]);
   assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);revision=results.find(r=>r.status===200).body.revision;
   const s=(await admin.call('/api/state')).body.state;assert.equal(s.ingredients[0].stock,6);assert.equal(s.orders.length,2);
  });
  await t.test('estoque insuficiente e aceite duplicado não deixam alterações parciais',async()=>{
   assert.equal((await operator.call('/api/mutate',mutation('order.accept',{id:orderId}))).status,409);
   assert.equal((await operator.call('/api/mutate',mutation('order.create',{...order,items:[{productId:'burger',quantity:100}]}))).status,409);
   const r=await admin.call('/api/state');assert.equal(r.body.revision,revision);assert.equal(r.body.state.ingredients[0].stock,6);
  });
  await t.test('histórico recupera versão; auditoria não aceita autoria forjada',async()=>{
   const state=(await admin.call('/api/state')).body.state;
   state.auditLogs.push({id:'forged',user:'Outro admin',action:'forged',date:new Date().toISOString()});
   let r=await admin.call('/api/mutate',mutation('state.save',state));assert.equal(r.status,200);revision=r.body.revision;
   assert.ok(!r.body.state.auditLogs.some(a=>a.id==='forged'));
   r=await admin.call('/api/mutate',mutation('state.restore',{revision:1}));assert.equal(r.status,200);revision=r.body.revision;
   assert.equal(r.body.state.ingredients[0].stock,10);assert.equal(r.body.state.orders.length,0);
   assert.ok((await admin.call('/api/history')).body.length>=4);
  });
  await t.test('redefinição pelo administrador revoga sessão; recuperação é de uso único',async()=>{
   assert.equal((await admin.call('/api/users',{id:opId,name:'Operador',email:'op@example.test',role:'operator',password:secret+'x'})).status,200);
   assert.equal((await operator.call('/api/state')).status,401);
   const token=randomUUID().replace(/-/g,'')+randomUUID().replace(/-/g,'');
   await db.query("INSERT INTO cloud_resets(hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",[digest(token),opId]);
   assert.equal((await guest.call('/api/auth/reset',{token,password:secret})).status,200);
   assert.equal((await guest.call('/api/auth/reset',{token,password:secret})).status,400);
   assert.equal((await operator.call('/api/auth/login',{email:'op@example.test',password:secret})).status,200);
   assert.equal((await operator.call('/api/logout',{})).status,200);assert.equal((await operator.call('/api/state')).status,401);
  });
  await t.test('limite de tentativas persiste no banco',async()=>{
   for(let i=0;i<5;i++)assert.equal((await guest.call('/api/auth/login',{email:'unknown@example.test',password:'wrong'})).status,401);
   assert.equal((await guest.call('/api/auth/login',{email:'unknown@example.test',password:'wrong'})).status,429);
  });
 } finally {await db.end();await root.query(`DROP SCHEMA ${schema} CASCADE`);await root.end();}
});
