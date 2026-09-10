var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// api/_lib/auth.ts
var auth_exports = {};
__export(auth_exports, {
  adminConfigured: () => adminConfigured,
  adminFromAuthHeader: () => adminFromAuthHeader,
  issueAdminToken: () => issueAdminToken,
  verifyAdminCredentials: () => verifyAdminCredentials,
  verifyAdminToken: () => verifyAdminToken
});
function adminEmail() {
  return (process.env.ADMIN_EMAIL || "admin@lajoaquina.com").toLowerCase().trim();
}
function adminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}
function adminSecret() {
  return process.env.ADMIN_SECRET || adminPassword();
}
function adminConfigured() {
  return adminPassword().length >= 8 && adminSecret().length >= 8;
}
function safeEqual(a, b) {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    const dummy = Buffer.alloc(Math.max(ba.length, bb.length));
    try {
      (0, import_crypto.timingSafeEqual)(dummy, dummy);
    } catch {
    }
    return false;
  }
  return (0, import_crypto.timingSafeEqual)(ba, bb);
}
function verifyAdminCredentials(email, password) {
  if (!adminConfigured()) return null;
  const emailOk = safeEqual((email || "").toLowerCase().trim(), adminEmail());
  const passOk = safeEqual(password || "", adminPassword());
  if (!emailOk || !passOk) return null;
  return { id: "admin-master", email: adminEmail(), name: "Administrador La Joaquina", role: "admin" };
}
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function issueAdminToken(profile) {
  const payload = { ...profile, iat: Date.now(), exp: Date.now() + TOKEN_TTL_MS };
  const body = b64url(payload);
  const sig = (0, import_crypto.createHmac)("sha256", adminSecret()).update(body).digest("hex");
  return `${body}.${sig}`;
}
function verifyAdminToken(token) {
  try {
    if (!token || !adminConfigured()) return null;
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = (0, import_crypto.createHmac)("sha256", adminSecret()).update(body).digest("hex");
    if (!safeEqual(sig, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.role !== "admin" || Date.now() > payload.exp) return null;
    return { id: payload.id, email: payload.email, name: payload.name, role: "admin" };
  } catch {
    return null;
  }
}
function adminFromAuthHeader(authHeader) {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return verifyAdminToken(m[1].trim());
}
var import_crypto, TOKEN_TTL_MS;
var init_auth = __esm({
  "api/_lib/auth.ts"() {
    import_crypto = require("crypto");
    TOKEN_TTL_MS = 30 * 24 * 3600 * 1e3;
  }
});

// api/_lib/db.ts
var db_exports = {};
__export(db_exports, {
  USE_PG: () => USE_PG,
  backendInfo: () => backendInfo,
  ensureSchema: () => ensureSchema,
  readDoc: () => readDoc,
  usePg: () => usePg,
  writeDoc: () => writeDoc
});
function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}
function usePg() {
  return Boolean(databaseUrl());
}
async function sql() {
  if (!sqlClient) {
    const { neon } = await import("@neondatabase/serverless");
    sqlClient = neon(databaseUrl());
  }
  return sqlClient;
}
async function ensureSchema() {
  if (!databaseUrl()) return;
  const db = await sql();
  await db`CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}
function defaultDb() {
  return {
    products: [],
    orders: [],
    users: [
      { id: "admin-1", email: "admin@lajoaquina.com", name: "Administrador La Joaquina", role: "admin" }
    ],
    adminPin: "admin123",
    stockAlerts: [],
    settings: null,
    distributors: []
  };
}
function loadFile() {
  if (fileCache) return fileCache;
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    if (import_fs.default.existsSync(DB_FILE)) {
      const parsed = JSON.parse(import_fs.default.readFileSync(DB_FILE, "utf-8"));
      fileCache = { ...defaultDb(), ...parsed };
      if (!Array.isArray(fileCache.stockAlerts)) fileCache.stockAlerts = [];
      if (!Array.isArray(fileCache.distributors)) fileCache.distributors = [];
    } else {
      fileCache = defaultDb();
      import_fs.default.writeFileSync(DB_FILE, JSON.stringify(fileCache, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("DB archivo no disponible, usando memoria:", err);
    fileCache = fileCache || defaultDb();
  }
  return fileCache;
}
function saveFile() {
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(fileCache, null, 2), "utf-8");
  } catch (err) {
    console.warn("No se pudo persistir DB local:", err);
  }
}
async function readDoc(key, fallback) {
  if (databaseUrl()) {
    try {
      await ensureSchema();
      const db2 = await sql();
      const rows = await db2`SELECT data FROM kv_store WHERE key = ${key}`;
      if (rows && rows.length > 0) return rows[0].data;
      return fallback;
    } catch (err) {
      console.warn(`PG read ${key} fall\xF3, usando fallback:`, err.message);
      return fallback;
    }
  }
  const db = loadFile();
  const val = db[key];
  return val === void 0 || val === null ? fallback : val;
}
async function writeDoc(key, value) {
  if (databaseUrl()) {
    const db = await sql();
    await db`INSERT INTO kv_store (key, data, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}, NOW())
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
    return;
  }
  loadFile();
  fileCache[key] = value;
  saveFile();
}
function backendInfo() {
  return { backend: databaseUrl() ? "postgres" : "file", persistent: true };
}
var import_fs, import_path, USE_PG, sqlClient, DATA_DIR, DB_FILE, fileCache;
var init_db = __esm({
  "api/_lib/db.ts"() {
    import_fs = __toESM(require("fs"), 1);
    import_path = __toESM(require("path"), 1);
    USE_PG = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
    sqlClient = null;
    DATA_DIR = import_path.default.join(process.cwd(), "data");
    DB_FILE = import_path.default.join(DATA_DIR, "cloud_db.json");
    fileCache = null;
  }
});

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
init_auth();

// api/_lib/core.ts
init_db();
init_auth();
var nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
var uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
async function listProducts() {
  return readDoc("products", []);
}
async function upsertProduct(product) {
  if (!product || !product.id || !product.name) throw new Error("Producto no v\xE1lido.");
  const list = await listProducts();
  const idx = list.findIndex((p) => p.id === product.id);
  const next = idx > -1 ? list.map((p, i) => i === idx ? product : p) : [product, ...list];
  await writeDoc("products", next);
  return product;
}
async function replaceProducts(products) {
  await writeDoc("products", Array.isArray(products) ? products : []);
  return (Array.isArray(products) ? products : []).length;
}
async function deleteProduct(id) {
  const list = await listProducts();
  await writeDoc("products", list.filter((p) => p.id !== id));
}
async function listOrders() {
  return readDoc("orders", []);
}
async function createOrder(order) {
  if (!order || !Array.isArray(order.items)) throw new Error("Orden requerida.");
  const orderId = order.orderId || `JQ-${Date.now().toString().slice(-6)}`;
  const full = {
    ...order,
    orderId,
    createdAt: order.createdAt || nowIso(),
    status: order.status || "pendiente"
  };
  const list = await listOrders();
  await writeDoc("orders", [full, ...list.filter((o) => o.orderId !== orderId)]);
  return full;
}
async function patchOrder(id, patch) {
  const allowed = ["status", "trackingCode", "adminNotes", "history"];
  const list = await listOrders();
  const idx = list.findIndex((o) => o.orderId === id);
  if (idx === -1) throw new Error("Pedido no encontrado.");
  const before = list[idx].status || "pendiente";
  for (const k of allowed) if (patch[k] !== void 0) list[idx][k] = patch[k];
  await writeDoc("orders", list);
  const updated = list[idx];
  let whatsappSent = false;
  const after = updated.status || "pendiente";
  if (patch.status && before !== after && ["confirmado", "pagado", "preparando", "enviado", "entregado"].includes(after)) {
    try {
      whatsappSent = await notifyOrderStatus(updated);
    } catch {
      whatsappSent = false;
    }
  }
  return { ...updated, whatsappSent };
}
async function deleteOrder(id) {
  const list = await listOrders();
  await writeDoc("orders", list.filter((o) => o.orderId !== id));
}
async function listStockAlerts() {
  return readDoc("stockAlerts", []);
}
async function createStockAlert(alert) {
  if (!alert || !alert.productId || !alert.customerEmail) {
    throw new Error("Producto y email son requeridos.");
  }
  const full = {
    id: alert.id || uid("alert"),
    productId: alert.productId,
    productName: alert.productName || "Producto",
    productImage: alert.productImage || "",
    productBrand: alert.productBrand || "La Joaquina",
    variantWeight: alert.variantWeight || "",
    customerEmail: String(alert.customerEmail).trim(),
    customerPhone: String(alert.customerPhone || "").trim(),
    customerName: String(alert.customerName || "").trim(),
    notes: String(alert.notes || "").trim(),
    createdAt: nowIso(),
    status: "pending"
  };
  const list = await listStockAlerts();
  await writeDoc("stockAlerts", [full, ...list]);
  return full;
}
async function patchStockAlert(id, patch) {
  const list = await listStockAlerts();
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error("Alerta no encontrada.");
  if (patch.status) list[idx].status = patch.status;
  if (patch.notes !== void 0) list[idx].notes = patch.notes;
  await writeDoc("stockAlerts", list);
  return list[idx];
}
async function deleteStockAlert(id) {
  const list = await listStockAlerts();
  await writeDoc("stockAlerts", list.filter((a) => a.id !== id));
}
async function listDistributors() {
  return readDoc("distributors", []);
}
async function upsertDistributor(d) {
  if (!d || !d.name) throw new Error("Nombre del distribuidor requerido.");
  const item = {
    id: d.id || uid("dist"),
    active: d.active !== false,
    createdAt: d.createdAt || nowIso(),
    ...d
  };
  const list = await listDistributors();
  const idx = list.findIndex((x) => x.id === item.id);
  const next = idx > -1 ? list.map((x, i) => i === idx ? { ...x, ...item } : x) : [item, ...list];
  await writeDoc("distributors", next);
  return next[idx > -1 ? idx : 0];
}
async function deleteDistributor(id) {
  const list = await listDistributors();
  await writeDoc("distributors", list.filter((d) => d.id !== id));
}
async function getSettings() {
  return readDoc("settings", null);
}
async function saveSettings(settings) {
  if (!settings) throw new Error("Configuraci\xF3n requerida.");
  const full = { ...settings, updatedAt: nowIso() };
  await writeDoc("settings", full);
  return full;
}
async function loginAdmin(email, password) {
  const profile = verifyAdminCredentials(email, password);
  if (!profile) return null;
  return { user: profile, token: issueAdminToken(profile) };
}
async function registerCustomer(name, email) {
  const clean = String(email || "").toLowerCase().trim();
  const profile = { id: uid("user"), email: clean, name: name || clean.split("@")[0] || "Cliente", role: "customer" };
  const users = await readDoc("users", []);
  await writeDoc("users", [...users, profile]);
  return profile;
}
var aiClient = null;
async function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!aiClient) {
    const { GoogleGenAI } = await import("@google/genai");
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}
function fallbackReply(message) {
  const lower = message.toLowerCase();
  if (lower.includes("cachorro") || lower.includes("perrito")) {
    return "Para cachorros te recomendamos f\xF3rmulas ricas en calcio, prote\xEDnas digestibles y DHA como **Dogui Cachorros** o **Raza Cachorros**. Pod\xE9s comprarlo ac\xE1 mismo con env\xEDo a todo el pa\xEDs.";
  }
  if (lower.includes("gato") || lower.includes("felino") || lower.includes("gatito") || lower.includes("castrado")) {
    return "Para felinos contamos con **Cat Chow Defense Plus**, **Raza Castrados** (protege el tracto urinario) y **Sabrosito Delicias del Mar**. Si tu gato est\xE1 castrado, prioriz\xE1 f\xF3rmulas para castrados.";
  }
  if (lower.includes("piedra") || lower.includes("arena") || lower.includes("olor")) {
    return "Para control de olores te sugerimos las **Piedras de S\xEDlice** (duran hasta 30 d\xEDas) o las **Aglomerantes Ultra Clumping** que forman bloques s\xF3lidos al instante.";
  }
  if (lower.includes("ave") || lower.includes("pajaro") || lower.includes("p\xE1jaro") || lower.includes("loro") || lower.includes("canario") || lower.includes("alpiste") || lower.includes("pez") || lower.includes("peces") || lower.includes("pecera") || lower.includes("acuario") || lower.includes("conejo") || lower.includes("cobayo") || lower.includes("hamster") || lower.includes("h\xE1mster") || lower.includes("tortuga") || lower.includes("jaula")) {
    return "Tambi\xE9n tenemos de todo para **otras mascotas**: alpiste y mix para aves, escamas y granulados para peces, mix y heno para cobayos y conejos, m\xE1s jaulas, peceras y accesorios. Mir\xE1 la categor\xEDa Otras mascotas \u{1F426}.";
  }
  if (lower.includes("envio") || lower.includes("env\xEDo") || lower.includes("zona") || lower.includes("donde") || lower.includes("bella vista") || lower.includes("tardan") || lower.includes("llega")) {
    return "Somos una tienda 100% online con base en Bella Vista: enviamos en 24/48 hs a todo el AMBA y por Correo Argentino a todo el pa\xEDs.";
  }
  if (lower.includes("pago") || lower.includes("pagar") || lower.includes("tarjeta") || lower.includes("transferencia") || lower.includes("cuota") || lower.includes("descuento") || lower.includes("cupon") || lower.includes("cup\xF3n")) {
    return "Aceptamos **Mercado Pago** (tarjetas y dinero en cuenta, con link de pago seguro), **transferencia bancaria con 10% OFF** y **efectivo** contra entrega. Adem\xE1s el cup\xF3n de la tienda te da descuento extra en el carrito.";
  }
  if (lower.includes("precio") || lower.includes("cuanto") || lower.includes("cu\xE1nto") || lower.includes("costo")) {
    return "Pod\xE9s ver todos los precios actualizados en el cat\xE1logo de la tienda, con presentaciones por kilo y promociones marcadas. Sum\xE1 al carrito y el total se calcula solo.";
  }
  return "\xA1Hola! \u{1F43E} En La Joaquina tenemos alimentos balanceados, piedras sanitarias y accesorios con env\xEDo a todo el pa\xEDs. Preguntame por nutrici\xF3n, env\xEDos, pagos o contame qu\xE9 mascota ten\xE9s.";
}
async function chatReply(message, history) {
  if (!message || typeof message !== "string") throw new Error("El mensaje es requerido.");
  const ai = await getGemini().catch(() => null);
  if (!ai) return { reply: fallbackReply(message), source: "local" };
  const systemPrompt = [
    'Sos JoaquiBot, asistente de "La Joaquina Pet Shop", tienda online argentina de mascotas con base en Bella Vista, Buenos Aires (solo online, sin local).',
    "Vend\xE9s SOLO por esta web con carrito: Mercado Pago online, transferencia con 10% OFF o efectivo. Env\xEDos desde Bella Vista a todo AMBA en 24/48 hs y al pa\xEDs por Correo Argentino.",
    "Tambi\xE9n hay categor\xEDa Otras mascotas: aves (alpiste, mix), peces (escamas, bettas), cobayos/conejos y accesorios (jaulas, peceras).",
    "NO menciones Mercado Libre: no vendemos por ah\xED.",
    "Tono argentino cordial, respuestas cortas con negritas. Ante s\xEDntomas graves, deriv\xE1 a un veterinario."
  ].join("\n");
  try {
    const convo = (Array.isArray(history) ? history.slice(-6) : []).map((h) => `${h.sender === "user" ? "Cliente" : "JoaquiBot"}: ${h.text}`).join("\n");
    const response = await Promise.race([
      ai.models.generateContent({ model: "gemini-2.0-flash", contents: `${systemPrompt}

${convo}
Cliente: ${message}
JoaquiBot:` }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout")), 8e3))
    ]);
    const text = response.text || "";
    if (!text.trim()) return { reply: fallbackReply(message), source: "local" };
    return { reply: text, source: "gemini" };
  } catch {
    return { reply: fallbackReply(message), source: "local" };
  }
}
function normalizePhoneAR(phone) {
  const digits = String(phone || "").replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 10) return null;
  return digits.startsWith("54") ? digits : "54" + digits;
}
function orderStatusMessage(order, storeName) {
  const total = Number(order.total || 0).toLocaleString("es-AR");
  const base = `\xA1Hola ${order.customerName}! Te escribimos de ${storeName} por tu pedido ${order.orderId} ($${total}).`;
  switch (order.status) {
    case "confirmado":
      return `${base} Ya lo confirmamos y lo estamos preparando.`;
    case "pagado":
      return `${base} Recibimos tu pago. Ya lo estamos preparando.`;
    case "preparando":
      return `${base} Ya est\xE1 en preparaci\xF3n. Te avisamos cuando salga para entrega.`;
    case "enviado":
      return `${base} \xA1Ya est\xE1 en camino!${order.trackingCode ? ` Seguilo con el c\xF3digo ${order.trackingCode}.` : ""}`;
    case "entregado":
      return `${base} Figura como entregado. \xBFLleg\xF3 todo bien? \xA1Gracias por tu compra!`;
    default:
      return `${base} Novedades sobre tu pedido.`;
  }
}
function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}
async function sendWhatsAppText(to, text) {
  if (!whatsappConfigured()) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9e3);
    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: text.slice(0, 4e3) }
      })
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
async function notifyOrderStatus(order) {
  const to = normalizePhoneAR(order.customerPhone);
  if (!to) return false;
  const settings = await getSettings().catch(() => null);
  const storeName = settings && settings.storeName || "La Joaquina Pet Shop";
  return sendWhatsAppText(to, orderStatusMessage(order, storeName));
}
function mpConfigured() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}
async function createMpPreference(order, baseUrl) {
  if (!mpConfigured()) throw new Error("Cobro online no configurado.");
  const { MercadoPagoConfig, Preference } = await import("mercadopago");
  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  const items = (order.items || []).map((it, i) => ({
    id: `${order.orderId}-${i}`,
    title: `${it.product?.name || "Producto"} (${it.selectedVariant?.weight || ""})`.slice(0, 250),
    quantity: Number(it.quantity) || 1,
    unit_price: Number(it.selectedVariant?.price) || 0,
    currency_id: "ARS"
  }));
  if (order.discount > 0) {
    items.push({ id: `${order.orderId}-desc`, title: "Descuentos aplicados", quantity: 1, unit_price: -Math.round(Number(order.discount)), currency_id: "ARS" });
  }
  if (order.shippingCost > 0) {
    items.push({ id: `${order.orderId}-envio`, title: "Costo de env\xEDo", quantity: 1, unit_price: Math.round(Number(order.shippingCost)), currency_id: "ARS" });
  }
  const preference = new Preference(client);
  const res = await preference.create({
    body: {
      items,
      payer: {
        name: order.customerName,
        email: order.customerEmail || void 0,
        phone: order.customerPhone ? { number: String(order.customerPhone) } : void 0
      },
      back_urls: {
        success: `${baseUrl}/?pago=exito&pedido=${order.orderId}`,
        failure: `${baseUrl}/?pago=fallo&pedido=${order.orderId}`,
        pending: `${baseUrl}/?pago=pendiente&pedido=${order.orderId}`
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/payments/webhook`,
      external_reference: order.orderId,
      statement_descriptor: "LA JOAQUINA"
    }
  });
  return { preferenceId: res.id, initPoint: res.init_point };
}
async function handleMpWebhook(query, body) {
  const paymentId = query.id || query["data.id"] || body?.data?.id;
  const topic = query.topic || query.type || body?.type;
  if (!paymentId || topic && topic !== "payment" && topic !== "merchant_order") {
    return { ok: false, reason: "not-a-payment" };
  }
  if (!mpConfigured()) return { ok: false, reason: "mp-not-configured" };
  const { MercadoPagoConfig, Payment } = await import("mercadopago");
  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  const payment = new Payment(client);
  const info = await payment.get({ id: String(paymentId) });
  const orderId = info.external_reference;
  if (!orderId) return { ok: false, reason: "no-external-reference" };
  if (info.status === "approved") {
    await patchOrder(orderId, { status: "pagado" });
    return { ok: true, orderId, status: "pagado" };
  }
  return { ok: true, orderId, status: info.status };
}

// server.ts
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path2.default.dirname(__filename);
var app = (0, import_express.default)();
var PORT = Number(process.env.PORT || 3e3);
app.use(import_express.default.json());
function needAdmin(req, res, next) {
  const profile = adminFromAuthHeader(req.headers.authorization);
  if (!profile) {
    res.status(401).json({ error: "No autorizado." });
    return;
  }
  req.admin = profile;
  next();
}
var ok = (res, data) => res.json(data);
var fail = (res, e, status = 400) => res.status(status).json({ error: e?.message || "Error en el servidor." });
app.get("/api/health", async (req, res) => {
  const [products, orders] = await Promise.all([listProducts(), listOrders()]);
  ok(res, {
    status: "ok",
    store: "La Joaquina Pet Shop",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    paymentsConfigured: mpConfigured(),
    productsCount: products.length,
    ordersCount: orders.length
  });
});
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    ok(res, await chatReply(message, history));
  } catch (e) {
    res.status(500).json({
      reply: "Tuvimos una intermitencia en el chat. Escribinos por WhatsApp y te ayudamos enseguida.",
      error: e?.message || "Chat error"
    });
  }
});
app.post("/api/order", async (req, res) => {
  try {
    const saved = await createOrder(req.body);
    ok(res, { success: true, order: saved, message: `\xA1Tu pedido ${saved.orderId} fue registrado con \xE9xito!` });
  } catch (e) {
    fail(res, e, 500);
  }
});
app.get("/api/cloud/status", async (req, res) => {
  const [products, orders] = await Promise.all([listProducts(), listOrders()]);
  ok(res, {
    connected: true,
    provider: "La Joaquina Cloud DB",
    version: "3.0",
    productsCount: products.length,
    ordersCount: orders.length
  });
});
app.get("/api/cloud/products", async (req, res) => {
  const products = await listProducts();
  ok(res, { success: true, products, count: products.length });
});
app.post("/api/cloud/products", needAdmin, async (req, res) => {
  try {
    const { product, products } = req.body;
    if (Array.isArray(products)) {
      const count = await replaceProducts(products);
      ok(res, { success: true, count });
      return;
    }
    ok(res, { success: true, product: await upsertProduct(product) });
  } catch (e) {
    fail(res, e);
  }
});
app.delete("/api/cloud/products/:id", needAdmin, async (req, res) => {
  await deleteProduct(req.params.id);
  ok(res, { success: true, message: "Producto eliminado." });
});
app.post("/api/cloud/products/reset", needAdmin, async (req, res) => {
  await replaceProducts([]);
  ok(res, { success: true, message: "Cat\xE1logo reseteado.", products: [] });
});
app.get("/api/cloud/orders", needAdmin, async (req, res) => {
  ok(res, { success: true, orders: await listOrders() });
});
app.post("/api/cloud/orders", async (req, res) => {
  try {
    const { order } = req.body;
    ok(res, { success: true, order: await createOrder(order) });
  } catch (e) {
    fail(res, e);
  }
});
app.patch("/api/cloud/orders/:id", needAdmin, async (req, res) => {
  try {
    ok(res, { success: true, order: await patchOrder(req.params.id, req.body) });
  } catch (e) {
    fail(res, e, 404);
  }
});
app.delete("/api/cloud/orders/:id", needAdmin, async (req, res) => {
  await deleteOrder(req.params.id);
  ok(res, { success: true });
});
app.get("/api/cloud/settings", async (req, res) => {
  ok(res, { success: true, settings: await getSettings() });
});
app.post("/api/cloud/settings", needAdmin, async (req, res) => {
  try {
    ok(res, { success: true, settings: await saveSettings(req.body.settings) });
  } catch (e) {
    fail(res, e);
  }
});
app.get("/api/cloud/distributors", needAdmin, async (req, res) => {
  ok(res, { success: true, distributors: await listDistributors() });
});
app.post("/api/cloud/distributors", needAdmin, async (req, res) => {
  try {
    const { distributor, distributors } = req.body;
    if (Array.isArray(distributors)) {
      const { writeDoc: writeDoc2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      await writeDoc2("distributors", distributors);
      ok(res, { success: true, count: distributors.length });
      return;
    }
    ok(res, { success: true, distributor: await upsertDistributor(distributor) });
  } catch (e) {
    fail(res, e);
  }
});
app.delete("/api/cloud/distributors/:id", needAdmin, async (req, res) => {
  await deleteDistributor(req.params.id);
  ok(res, { success: true });
});
app.get("/api/cloud/stock-alerts", needAdmin, async (req, res) => {
  ok(res, { success: true, alerts: await listStockAlerts() });
});
app.post("/api/cloud/stock-alerts", async (req, res) => {
  try {
    const saved = await createStockAlert(req.body.alert);
    ok(res, { success: true, alert: saved, message: "\xA1Alerta registrada con \xE9xito!" });
  } catch (e) {
    fail(res, e);
  }
});
app.patch("/api/cloud/stock-alerts/:id", needAdmin, async (req, res) => {
  try {
    ok(res, { success: true, alert: await patchStockAlert(req.params.id, req.body) });
  } catch (e) {
    fail(res, e, 404);
  }
});
app.delete("/api/cloud/stock-alerts/:id", needAdmin, async (req, res) => {
  await deleteStockAlert(req.params.id);
  ok(res, { success: true, message: "Alerta eliminada" });
});
app.post("/api/cloud/auth/login", async (req, res) => {
  const { adminConfigured: adminConfigured2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
  if (!adminConfigured2()) {
    res.status(503).json({ error: "Acceso de administrador no configurado. Defin\xED ADMIN_PASSWORD en el servidor." });
    return;
  }
  const { email, password } = req.body;
  const result = await loginAdmin(email, password);
  if (!result) {
    res.status(401).json({ error: "Credenciales inv\xE1lidas." });
    return;
  }
  ok(res, { success: true, user: result.user, token: result.token });
});
app.post("/api/cloud/auth/register", async (req, res) => {
  const { name, email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email requerido." });
    return;
  }
  ok(res, { success: true, user: await registerCustomer(name, email) });
});
app.get("/api/cloud/auth/me", async (req, res) => {
  const profile = adminFromAuthHeader(req.headers.authorization);
  if (!profile) {
    res.status(401).json({ error: "Sesi\xF3n inv\xE1lida." });
    return;
  }
  ok(res, { success: true, user: profile });
});
app.post("/api/payments/create", async (req, res) => {
  if (!mpConfigured()) {
    res.status(503).json({ error: "El cobro online no est\xE1 configurado. Eleg\xED transferencia o coordin\xE1 por WhatsApp." });
    return;
  }
  try {
    const base = (process.env.BACKEND_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
    const saved = await createOrder({ ...req.body.order, status: "pago_pendiente" });
    const pref = await createMpPreference(saved, base);
    ok(res, { success: true, order: saved, initPoint: pref.initPoint, preferenceId: pref.preferenceId });
  } catch (e) {
    fail(res, e);
  }
});
app.all("/api/payments/webhook", async (req, res) => {
  try {
    const query = req.query;
    const result = await handleMpWebhook(query, req.body || {});
    ok(res, { success: true, ...result });
  } catch (e) {
    ok(res, { success: false, error: e?.message || "Webhook error" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app.use(vite.middlewares);
    app.get("/", async (req, res, next) => {
      try {
        const html = await vite.transformIndexHtml(req.originalUrl, import_fs2.default.readFileSync(import_path2.default.join(process.cwd(), "index.html"), "utf-8"));
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    });
    app.get("/admin.html", async (req, res, next) => {
      try {
        const html = await vite.transformIndexHtml(req.originalUrl, import_fs2.default.readFileSync(import_path2.default.join(process.cwd(), "admin.html"), "utf-8"));
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get(["/admin", "/admin.html", "/admin/*"], (req, res) => {
      const adminFile = import_path2.default.join(distPath, "admin.html");
      if (import_fs2.default.existsSync(adminFile)) {
        res.sendFile(adminFile);
        return;
      }
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F43E} La Joaquina Server corriendo en http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
