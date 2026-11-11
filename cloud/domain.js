const { randomUUID } = require('node:crypto');
const { z } = require('zod');
const { ensure } = require('./security');
const inventory = require('../services/order-inventory.service');
const arrays = ['ingredients','products','purchases','sales','orders','movements','expenses','cashClosings','cashAdjustments','auditLogs','deliveries','stockAdjustments','customers'];
const emptyState = () => Object.fromEntries([...arrays.map(k => [k, []]), ['settings', {}]]);
const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
const amount = z.number().finite().min(0).max(100000000);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const text = z.string().max(2000);
function validateTree(value, depth = 0) {
  ensure(depth < 16, 'Dados com estrutura inválida.');
  if (typeof value === 'number') ensure(Number.isFinite(value), 'Número inválido.');
  if (typeof value === 'string') ensure(value.length <= 200000, 'Texto muito grande.');
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    ensure(!['__proto__','prototype','constructor'].includes(key), 'Campo inválido.');
    if (key === 'id' || (key.endsWith('Id') && child)) id.parse(child);
    validateTree(child, depth + 1);
  }
}
function validateState(input) {
  ensure(input && typeof input === 'object' && !Array.isArray(input), 'Backup inválido.');
  validateTree(input);
  ensure(Object.keys(input).every(key => arrays.includes(key) || key === 'settings'), 'Campos desconhecidos no backup.');
  const s = { ...emptyState(), ...structuredClone(input) };
  for (const key of arrays) {
    ensure(Array.isArray(s[key]) && s[key].length <= 100000, `Lista inválida: ${key}.`);
    const ids = new Set();
    for (const row of s[key]) {
      ensure(row && typeof row === 'object' && !Array.isArray(row), `Registro inválido: ${key}.`);
      id.parse(row.id);
      ensure(!ids.has(row.id), `Identificador duplicado em ${key}.`); ids.add(row.id);
    }
  }
  ensure(s.settings && typeof s.settings === 'object' && !Array.isArray(s.settings), 'Configurações inválidas.');
  for (const i of s.ingredients) {
    z.string().min(1).max(200).parse(i.name); amount.parse(i.stock); amount.parse(i.min);
    z.enum(['un','g','kg','ml','l']).parse(i.unit);
  }
  for (const p of s.products) {
    amount.parse(p.price); z.string().min(1).max(200).parse(p.name);
    ensure(Array.isArray(p.recipe), 'Ficha técnica inválida.');
    const used = new Set();
    for (const line of p.recipe) {
      ensure(s.ingredients.some(i => i.id === line.ingredientId) && !used.has(line.ingredientId), 'Ingrediente ausente ou repetido na ficha técnica.');
      used.add(line.ingredientId); z.number().finite().positive().max(100000000).parse(line.quantity);
    }
    ensure(!p.imageUrl || /^https:\/\//i.test(p.imageUrl) || /^data:image\/(png|jpeg|webp);base64,/i.test(p.imageUrl), 'Use uma imagem HTTPS, PNG, JPEG ou WebP.');
  }
  for (const p of s.purchases) { amount.parse(p.cost); z.number().finite().positive().parse(p.quantity); }
  for (const e of s.expenses) amount.parse(e.amount);
  for (const sale of s.sales) { amount.parse(sale.total); amount.parse(sale.price); z.number().finite().positive().parse(sale.quantity); }
  return s;
}
const orderInput = z.object({
  items: z.array(z.object({ productId: id, quantity: z.number().int().positive().max(10000) }).strict()).min(1).max(100),
  customerName: z.string().trim().min(1).max(150), customerPhone: z.string().max(30).default(''),
  customerWhatsapp: z.boolean().default(true), address: text.default(''), note: text.default(''),
  destination: z.enum(['delivery','table','pickup']), paymentMethod: z.enum(['pix','cash','credit','debit','money','card','other','not_informed','dinheiro','credito','debito']).default('pix'),
  deliveryFee: amount.default(0), discount: amount.default(0), surcharge: amount.default(0),
}).strict();
function addAudit(s, user, action, detail = '') {
  s.auditLogs.push({ id: randomUUID(), date: new Date().toISOString(), user: user.name, action, detail });
}
function cost(s, recipe) {
  return recipe.reduce((sum, line) => {
    const buys = s.purchases.filter(p => p.ingredientId === line.ingredientId);
    const qty = buys.reduce((n,p) => n + p.quantity, 0);
    return sum + line.quantity * (qty ? buys.reduce((n,p) => n + p.cost, 0) / qty : 0);
  }, 0);
}
function fulfill(s, order, user) {
  ensure(!order.inventoryDeductedAt && !s.sales.some(x => x.orderId === order.id), 'Este pedido já foi aceito.', 409);
  const result = inventory.deductOnce(order, order.items, s.products, s.ingredients);
  ensure(result.ok, result.message, 409);
  const now = new Date().toISOString();
  for (const r of result.requirements) {
    const i = s.ingredients.find(x => x.id === r.ingredientId);
    s.movements.push({ id: randomUUID(), type: 'venda', ingredientId: i.id, ingredientName: i.name, unit: i.unit, quantity: r.quantity, source: 'Pedido', sourceId: order.id, date: now });
  }
  let distributed = 0;
  const totalCents = Math.round(order.total * 100);
  const totalWeight = order.items.reduce((n,i) => n + (order.subtotal > 0 ? i.total : i.quantity), 0);
  const sales = order.items.map((item, index) => {
    const product = s.products.find(p => p.id === item.productId);
    const cmvUnit = cost(s, product.recipe), cmvTotal = money(cmvUnit * item.quantity);
    const cents = index === order.items.length - 1 ? totalCents - distributed : Math.floor(totalCents * (order.subtotal > 0 ? item.total : item.quantity) / totalWeight);
    distributed += cents;
    return { id: randomUUID(), productId: product.id, productName: product.name, quantity: item.quantity,
      price: item.price, total: cents / 100, date: now, recipeSnapshot: structuredClone(product.recipe),
      cmvUnit, cmvTotal, grossProfit: money(cents / 100 - cmvTotal), source: 'cardapio', orderId: order.id };
  });
  s.sales.push(...sales);
  Object.assign(order, { status: 'in_production', acceptedAt: now, confirmedAt: now, statusUpdatedAt: now, saleId: sales[0].id, saleIds: sales.map(x => x.id) });
  addAudit(s, user, 'Pedido aceito', order.id);
}
function createOrder(s, input, user) {
  const data = orderInput.parse(input);
  ensure(data.destination === 'pickup' || data.address.trim(), 'Informe o endereço ou a mesa.');
  const items = data.items.map(item => {
    const p = s.products.find(p => p.id === item.productId && p.menuActive !== false);
    ensure(p, 'Produto indisponível.', 409);
    return { productId: p.id, productName: p.menuName || p.name, quantity: item.quantity, price: p.price, total: money(p.price * item.quantity) };
  });
  const subtotal = money(items.reduce((n,i) => n+i.total,0));
  ensure(data.discount <= subtotal + data.deliveryFee + data.surcharge, 'Desconto maior que o total.');
  const now = new Date().toISOString();
  const order = { ...data, id: randomUUID(), items, subtotal, total: money(subtotal+data.deliveryFee+data.surcharge-data.discount),
    productId: items[0].productId, productName: items.length === 1 ? items[0].productName : `${items.length} itens`,
    quantity: items.reduce((n,i) => n+i.quantity,0), price: items[0].price, date: now, status: 'awaiting_acceptance' };
  fulfill(s, order, user);
  const phone = data.customerPhone.replace(/\D/g, '');
  if (phone) {
    let customer = s.customers.find(c => c.phone === phone);
    if (!customer) {
      customer = { id: randomUUID(), phone, firstOrderAt: now, createdAt: now, orderCount: 0, totalSpent: 0, address: '' };
      s.customers.push(customer);
    }
    Object.assign(customer, { name: data.customerName, whatsapp: data.customerWhatsapp, lastOrderAt: now, updatedAt: now,
      address: data.destination === 'delivery' ? data.address : customer.address, orderCount: customer.orderCount + 1, totalSpent: money(customer.totalSpent + order.total) });
    order.customerId = customer.id;
  }
  s.orders.push(order);
  return { orderId: order.id };
}
function orderAction(s, action, data, user) {
  if (action === 'order.create') return createOrder(s, data, user);
  id.parse(data.id);
  const order = s.orders.find(o => o.id === data.id);
  ensure(order, 'Pedido não encontrado.', 404);
  const now = new Date().toISOString();
  if (action === 'order.accept') {
    ensure(order.status === 'awaiting_acceptance', 'Pedido não está aguardando aceite.', 409); fulfill(s, order, user);
  } else if (action === 'order.advance') {
    const next = { in_production:'ready', ready:'dispatching', dispatching:'payment_confirmed' }[order.status];
    ensure(next, 'Não é possível avançar este pedido.', 409);
    order.status = next; order.statusUpdatedAt = now;
    order[{ready:'readyAt',dispatching:'dispatchedAt',payment_confirmed:'paidAt'}[next]] = now;
  } else if (action === 'order.cancel') {
    ensure(!['canceled','payment_confirmed'].includes(order.status), 'Pedido já finalizado.', 409);
    const reason = z.string().trim().min(3).max(500).parse(data.reason);
    const loss = money(s.sales.filter(x => x.orderId === order.id).reduce((n,x) => n+x.cmvTotal,0));
    if (loss) s.expenses.push({id:randomUUID(),category:'Outros',description:`Perda por cancelamento ${order.id}`,amount:loss,date:now});
    Object.assign(order, {cancelStage:order.status, cancelReason:reason, cancelNote:text.parse(data.note || ''), status:'canceled',canceledAt:now,statusUpdatedAt:now});
    // Production consumption is retained; cancelled sales are excluded by the UI's existing reporting rules.
  } else if (action === 'delivery.start') {
    ensure(order.destination === 'delivery' && ['ready','dispatching'].includes(order.status), 'A entrega exige um pedido pronto.', 409);
    ensure(!order.deliveryStartedAt, 'Entrega já iniciada.', 409);
    const name = z.string().trim().min(2).max(100).parse(data.name), fee = amount.parse(data.fee);
    Object.assign(order, {status:'dispatching',statusUpdatedAt:now,dispatchedAt:now,deliveryPerson:name,deliveryFeePaid:fee,deliveryStartedAt:now});
    s.deliveries.push({id:randomUUID(),orderId:order.id,orderNumber:order.id.replace(/-/g,'').slice(-6).toUpperCase(),customerName:order.customerName,motoboy:name,fee,startedAt:now,deliveredAt:''});
  } else if (action === 'delivery.finish') {
    ensure(order.deliveryStartedAt && !order.deliveryFinishedAt && order.status !== 'canceled', 'Entrega não está em andamento.', 409);
    order.deliveryFinishedAt=now;
    const delivery = s.deliveries.find(d => d.orderId === order.id && !d.deliveredAt);
    ensure(delivery, 'Entrega não encontrada.', 409); delivery.deliveredAt=now;
  } else ensure(false, 'Operação desconhecida.', 404);
  addAudit(s,user,action,order.id);
  return { orderId:order.id };
}
function visibleState(state, user) {
  const result = structuredClone(state);
  if (user.role !== 'admin') {
    for (const key of ['purchases','sales','expenses','cashClosings','cashAdjustments','auditLogs','stockAdjustments','movements']) result[key] = [];
  }
  return result;
}
module.exports = { emptyState, validateState, orderAction, visibleState, addAudit, arrays, money };
