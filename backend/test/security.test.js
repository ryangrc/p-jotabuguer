const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const vm = require("node:vm");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const { env } = require("../src/config/env");
const { requireAuth } = require("../src/middlewares/auth");
const { userService } = require("../src/services/user.service");
const { authService } = require("../src/services/auth.service");
const { createApp } = require("../src/app");
const { errorHandler } = require("../src/middlewares/error-handler");

test("production refuses absent or example signing secrets", () => {
  for (const secret of ["", "short", "desenvolvimento-altere-este-segredo"]) {
    const result = spawnSync(process.execPath, ["-e", "require('./src/config/env')"], {
      cwd: path.join(__dirname, ".."), env: { ...process.env, NODE_ENV: "production", JWT_SECRET: secret },
    });
    assert.notEqual(result.status, 0);
  }
});

test("authentication requires Bearer, HS256, unexpired token and an active user", async () => {
  const original = userService.findById;
  userService.findById = async () => ({ id: "test", active: true });
  const check = async (authorization) => {
    let failure;
    await requireAuth({ headers: { authorization } }, {}, (error) => { failure = error; });
    return failure;
  };
  try {
    const token = jwt.sign({}, env.jwtSecret, { subject: "test", expiresIn: "1h" });
    assert.equal(await check(`Bearer ${token}`), undefined);
    for (const header of ["", `Basic ${token}`, "Bearer bad", `Bearer ${jwt.sign({}, env.jwtSecret, { algorithm: "HS384" })}`, `Bearer ${jwt.sign({}, env.jwtSecret, { expiresIn: -1 })}`]) {
      assert.equal((await check(header)).status, 401);
    }
    userService.findById = async () => ({ active: false });
    assert.equal((await check(`Bearer ${token}`)).status, 401);
  } finally { userService.findById = original; }
});

test("setup rejects missing and incorrect bootstrap tokens before accessing the database", async () => {
  const previous = env.setupToken;
  try {
    env.setupToken = "";
    await assert.rejects(authService.setup({}), { status: 403 });
    env.setupToken = "private-bootstrap-token";
    await assert.rejects(authService.setup({}, "wrong"), { status: 403 });
  } finally { env.setupToken = previous; }
});

test("HTTP protects routes, rejects invalid input and limits authentication attempts", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/api/orders`);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    for (let i = 0; i < 10; i++) {
      const invalid = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      assert.equal(invalid.status, 400);
    }
    assert.equal((await fetch(`${base}/api/auth/login`, { method: "POST" })).status, 429);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test("unexpected errors never expose database details", () => {
  const original = console.error;
  console.error = () => {};
  try {
    let body;
    errorHandler(new Error("postgres secret schema"), {}, { status(n) { assert.equal(n, 500); return this; }, json(value) { body = value; } }, () => {});
    assert.equal(body.error.message, "Erro interno do servidor.");
    assert.equal(body.error.details, null);
  } finally { console.error = original; }
});

test("malicious backup identifiers stay inside escaped HTML attributes", () => {
  const source = readFileSync(path.join(__dirname, "../../app.js"), "utf8").split("\nbindEvents();")[0];
  const nodes = {};
  const context = vm.createContext({
    localStorage: { getItem: () => null }, sessionStorage: { getItem: () => null },
    document: { querySelector: (selector) => nodes[selector] ||= { value: "" }, querySelectorAll: () => [] },
  });
  vm.runInContext(source, context);
  vm.runInContext(`state = normalizeState({ ingredients: [{id: '\"><img src=x onerror=alert(1)>', name: '<script>x</script>', unit: 'un'}] }); renderInventory();`, context);
  assert.doesNotMatch(nodes["#inventoryTable"].innerHTML, /<img|<script/);
  assert.match(nodes["#inventoryTable"].innerHTML, /&quot;&gt;&lt;img/);
  const options = vm.runInContext("ingredientOptions()", context);
  assert.doesNotMatch(options, /<img|<script/);
  for (const text of ["=1+1", "+1", "-1", "@SUM(1)", "\t=1", " \r=1"]) {
    context.cell = text;
    assert.equal(vm.runInContext("csvEscape(cell)", context), `"'${text}"`);
  }
  assert.equal(vm.runInContext("csvEscape(-12.5)", context), '"-12.5"');
  assert.equal(vm.runInContext('csvEscape(\'P"Jota\')', context), '"P""Jota"');
});
