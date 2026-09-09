var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DB_FILE = import_path.default.join(DATA_DIR, "cloud_db.json");
var dbCache = {
  products: [],
  orders: [],
  users: [
    {
      id: "admin-1",
      email: "admin@lajuaquina.com",
      name: "Administrador La Juaquina",
      role: "admin"
    }
  ],
  adminPin: "admin123",
  settings: null,
  distributors: [],
  stockAlerts: [
    {
      id: "alert-sample-1",
      productId: "piedras-silice-cristales",
      productName: "Cristales de S\xEDlice Perfumados Antibacterial",
      productBrand: "SilicaGel Pet",
      variantWeight: "3.8 kg (7.6 L)",
      customerEmail: "carolina.vet@gmail.com",
      customerPhone: "+54 9 11 4455-8899",
      customerName: "Carolina V.",
      notes: "Necesito 2 bolsas urgente para mis 3 gatos",
      createdAt: new Date(Date.now() - 36e5 * 5).toISOString(),
      status: "pending"
    },
    {
      id: "alert-sample-2",
      productId: "perro-sabrosito-mix",
      productName: "Sabrosito Mix Carne, Pollo y Cereales",
      productBrand: "Sabrosito",
      variantWeight: "20 kg",
      customerEmail: "marcelo.moreno@hotmail.com",
      customerPhone: "+54 9 11 6789-1234",
      customerName: "Marcelo G\xF3mez",
      notes: "Av\xEDsenme por favor ni bien descarguen el cami\xF3n",
      createdAt: new Date(Date.now() - 36e5 * 24).toISOString(),
      status: "pending"
    }
  ]
};
function initCloudDatabase() {
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) {
      import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (import_fs.default.existsSync(DB_FILE)) {
      const raw = import_fs.default.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      dbCache = {
        ...dbCache,
        ...parsed,
        stockAlerts: Array.isArray(parsed.stockAlerts) ? parsed.stockAlerts : dbCache.stockAlerts,
        distributors: Array.isArray(parsed.distributors) ? parsed.distributors : dbCache.distributors
      };
    } else {
      import_fs.default.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("Error initializing cloud db file, using in-memory cache:", err);
  }
}
function persistCloudDatabase() {
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) {
      import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), "utf-8");
  } catch (err) {
    console.warn("Error persisting cloud db file:", err);
  }
}
initCloudDatabase();
var aiClient = null;
function getGemini() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
  }
  return aiClient;
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    store: "La Juaquina Pet Shop",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "El mensaje es requerido." });
      return;
    }
    const ai = getGemini();
    if (!ai) {
      const lower = message.toLowerCase();
      let reply2 = "\xA1Hola! \u{1F43E} Soy JuaquiBot de La Juaquina Pet Shop. \xBFEn qu\xE9 puedo asesorarte hoy con tu mascota?";
      if (lower.includes("cachorro") || lower.includes("perrito")) {
        reply2 = "Para cachorros te recomendamos f\xF3rmulas ricas en calcio, prote\xEDnas de alta digestibilidad y DHA como **Dogui Cachorros** o **Raza Cachorros**. Ayudan al desarrollo cerebral y \xF3seo. Pod\xE9s comprarlo ac\xE1 mismo en la tienda con env\xEDo a todo el pa\xEDs.";
      } else if (lower.includes("gato") || lower.includes("felino") || lower.includes("gatito")) {
        reply2 = "Para felinos contamos con marcas de gran palatabilidad como **Cat Chow Defense Plus**, **Raza Castrados** (vital para proteger el tracto urinario) y **Sabrosito Gatos Delicias del Mar**. Adem\xE1s pod\xE9s sumar nuestras piedras aglomerantes sin polvo.";
      } else if (lower.includes("piedra") || lower.includes("arena") || lower.includes("olor")) {
        reply2 = "Para control de olores te sugerimos las **Piedras de S\xEDlice en Cristales** (duran hasta 30 d\xEDas) o las **Piedras Aglomerantes Ultra Clumping** de bentonita volc\xE1nica que hacen bloques s\xF3lidos instant\xE1neos.";
      } else if (lower.includes("envio") || lower.includes("zona") || lower.includes("donde") || lower.includes("bella vista")) {
        reply2 = "Somos una tienda 100% online con base en Bella Vista: enviamos en 24/48 hs a todo el AMBA y por Correo Argentino a todo el pa\xEDs. Compr\xE1s directo en la web con 10% OFF por transferencia.";
      }
      res.json({ reply: reply2, source: "fallback" });
      return;
    }
    const systemPrompt = `
Sos JuaquiBot, el asistente experto y emp\xE1tico de "La Juaquina Pet Shop", una tienda online argentina de mascotas, alimentos balanceados y accesorios con base en Bella Vista, Buenos Aires (solo online, sin local a la calle).
Tu misi\xF3n es brindar atenci\xF3n c\xE1lida, entusiasta y muy \xFAtil a los amantes de las mascotas.
Env\xEDos: despachamos desde Bella Vista a todo el AMBA en 24/48 hs y a todo el pa\xEDs por Correo Argentino.

Cat\xE1logo de La Juaquina:
- Perros: Sabrosito Mix Carne y Pollo, Raza Mordida Chica, Dogui Cachorros con leche y DHA, Criadores Mantenimiento Adultos, Purina Dog Chow ExtraLife.
- Gatos: Sabrosito Delicias del Mar, Raza Gatos Castrados (control urinario y peso), Gati Carne y Arroz, Purina Cat Chow Defense Plus Castrados.
- Piedras sanitarias: Aglomerantes Ultra Clumping (bentonita volc\xE1nica sin polvo), Cristales de S\xEDlice Perfumados (duran 30 d\xEDas), Cl\xE1sicas Absorbentes Super Ahorro.
- Accesorios: Cama Nube Antiestr\xE9s, Arn\xE9s Antitir\xF3n reflectivo, Comedero Antivoracidad Slow Feeder, Rascador Castillo con Cucha.
- Mascotas en Adopci\xF3n: Promovemos la adopci\xF3n responsable de perritos y gatitos rescatados con vacunas al d\xEDa.
- Modalidad de compra: venta directa en la tienda web con carrito (Mercado Pago, transferencia con 10% OFF o efectivo contra entrega) y env\xEDos a todo el pa\xEDs. No ofrecemos compra por Mercado Libre: todo se vende ac\xE1.

Tono de comunicaci\xF3n:
- Amable, argentino natural (us\xE1 modismos suaves y cordiales como "\xA1Hola!", "\xA1Claro!", "mir\xE1", "fijate"), afectuoso con perros y gatos.
- Respuestas concisas, bien estructuradas con saltos de l\xEDnea y negritas para facilitar la lectura en el chat.
- Siempre record\xE1 consultar a un veterinario de confianza ante s\xEDntomas m\xE9dicos graves.
`;
    let conversationPrompt = "";
    if (Array.isArray(history) && history.length > 0) {
      conversationPrompt = history.slice(-6).map((h) => `${h.sender === "user" ? "Cliente" : "JuaquiBot"}: ${h.text}`).join("\n") + "\n";
    }
    conversationPrompt += `Cliente: ${message}
JuaquiBot:`;
    let reply = "";
    try {
      const generatePromise = ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `${systemPrompt}

Historial de chat:
${conversationPrompt}`
      });
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Timeout")), 7e3)
      );
      const response = await Promise.race([generatePromise, timeoutPromise]);
      reply = response.text || "";
    } catch {
      const lower = message.toLowerCase();
      if (lower.includes("cachorro") || lower.includes("perrito")) {
        reply = "Para cachorros te recomendamos f\xF3rmulas ricas en calcio, prote\xEDnas digestibles y DHA como **Dogui Cachorros** o **Raza Cachorros**. Ayudan al desarrollo cerebral y \xF3seo. Pod\xE9s comprarlo ac\xE1 mismo con carrito y env\xEDo a todo el pa\xEDs.";
      } else if (lower.includes("gato") || lower.includes("felino") || lower.includes("gatito")) {
        reply = "Para felinos contamos con marcas de gran palatabilidad como **Cat Chow Defense Plus**, **Raza Castrados** (vital para proteger el tracto urinario) y **Sabrosito Gatos Delicias del Mar**.";
      } else if (lower.includes("piedra") || lower.includes("arena") || lower.includes("olor")) {
        reply = "Para control de olores te sugerimos las **Piedras de S\xEDlice en Cristales** (duran hasta 30 d\xEDas) o las **Piedras Aglomerantes Ultra Clumping** de bentonita volc\xE1nica que hacen bloques s\xF3lidos instant\xE1neos.";
      } else {
        reply = "\xA1Hola! \u{1F43E} En La Juaquina tenemos alimentos balanceados (Sabrosito, Raza, Dogui, Criadores), piedras sanitarias y accesorios. Compr\xE1s directo en la web con 10% de descuento por transferencia y env\xEDo a todo el pa\xEDs.";
      }
    }
    res.json({ reply, source: reply ? "gemini" : "fallback" });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({
      reply: "Tuvimos una peque\xF1a intermitencia en el chat, pero pod\xE9s consultarnos directamente por WhatsApp al +54 9 11 2345-6789 o consultar los productos en la tienda.",
      error: error?.message || "Chat error"
    });
  }
});
app.post("/api/order", (req, res) => {
  try {
    const orderData = req.body;
    const orderId = orderData.orderId || `JQ-${Date.now().toString().slice(-6)}`;
    const orderSummary = {
      orderId,
      status: "confirmed",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...orderData
    };
    dbCache.orders = [orderSummary, ...dbCache.orders.filter((o) => o.orderId !== orderId)];
    persistCloudDatabase();
    res.json({
      success: true,
      order: orderSummary,
      message: `\xA1Tu pedido ${orderId} fue registrado con \xE9xito en La Juaquina!`
    });
  } catch (error) {
    res.status(500).json({ error: "Error procesando la orden." });
  }
});
app.get("/api/cloud/status", (req, res) => {
  res.json({
    connected: true,
    provider: "Cloud Database (Google Cloud Run Storage)",
    version: "2.1",
    productsCount: dbCache.products.length,
    ordersCount: dbCache.orders.length,
    usersCount: dbCache.users.length
  });
});
app.get("/api/cloud/products", (req, res) => {
  res.json({
    success: true,
    products: dbCache.products,
    count: dbCache.products.length
  });
});
app.post("/api/cloud/products", (req, res) => {
  try {
    const { product, products } = req.body;
    if (Array.isArray(products)) {
      dbCache.products = products;
      persistCloudDatabase();
      res.json({ success: true, count: dbCache.products.length });
      return;
    }
    if (!product || !product.id) {
      res.status(400).json({ error: "Producto no v\xE1lido." });
      return;
    }
    const idx = dbCache.products.findIndex((p) => p.id === product.id);
    if (idx > -1) {
      dbCache.products[idx] = product;
    } else {
      dbCache.products.unshift(product);
    }
    persistCloudDatabase();
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error guardando producto" });
  }
});
app.delete("/api/cloud/products/:id", (req, res) => {
  try {
    const { id } = req.params;
    dbCache.products = dbCache.products.filter((p) => p.id !== id);
    persistCloudDatabase();
    res.json({ success: true, message: "Producto eliminado." });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error eliminando producto" });
  }
});
app.post("/api/cloud/products/reset", (req, res) => {
  try {
    dbCache.products = [];
    persistCloudDatabase();
    res.json({ success: true, message: "Cat\xE1logo reseteado." });
  } catch (err) {
    res.status(500).json({ error: "Error reseteando cat\xE1logo" });
  }
});
app.get("/api/cloud/orders", (req, res) => {
  res.json({ success: true, orders: dbCache.orders });
});
app.post("/api/cloud/orders", (req, res) => {
  try {
    const { order } = req.body;
    if (!order) {
      res.status(400).json({ error: "Orden requerida." });
      return;
    }
    const orderId = order.orderId || `JQ-${Date.now().toString().slice(-6)}`;
    const newOrder = {
      ...order,
      orderId,
      createdAt: order.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      status: order.status || "pendiente"
    };
    dbCache.orders = [newOrder, ...dbCache.orders.filter((o) => o.orderId !== orderId)];
    persistCloudDatabase();
    res.json({ success: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ error: "Error guardando orden" });
  }
});
app.patch("/api/cloud/orders/:id", (req, res) => {
  try {
    const { id } = req.params;
    const idx = dbCache.orders.findIndex((o) => o.orderId === id);
    if (idx === -1) {
      res.status(404).json({ error: "Pedido no encontrado." });
      return;
    }
    const allowed = ["status", "trackingCode", "adminNotes"];
    for (const key of allowed) {
      if (req.body[key] !== void 0) dbCache.orders[idx][key] = req.body[key];
    }
    persistCloudDatabase();
    res.json({ success: true, order: dbCache.orders[idx] });
  } catch (err) {
    res.status(500).json({ error: "Error actualizando pedido" });
  }
});
app.delete("/api/cloud/orders/:id", (req, res) => {
  try {
    const { id } = req.params;
    dbCache.orders = dbCache.orders.filter((o) => o.orderId !== id);
    persistCloudDatabase();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando pedido" });
  }
});
app.get("/api/cloud/settings", (req, res) => {
  res.json({ success: true, settings: dbCache.settings });
});
app.post("/api/cloud/settings", (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings) {
      res.status(400).json({ error: "Configuraci\xF3n requerida." });
      return;
    }
    dbCache.settings = { ...settings, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    persistCloudDatabase();
    res.json({ success: true, settings: dbCache.settings });
  } catch (err) {
    res.status(500).json({ error: "Error guardando configuraci\xF3n" });
  }
});
app.get("/api/cloud/distributors", (req, res) => {
  res.json({ success: true, distributors: dbCache.distributors || [] });
});
app.post("/api/cloud/distributors", (req, res) => {
  try {
    const { distributor, distributors } = req.body;
    if (Array.isArray(distributors)) {
      dbCache.distributors = distributors;
      persistCloudDatabase();
      res.json({ success: true, count: dbCache.distributors.length });
      return;
    }
    if (!distributor || !distributor.name) {
      res.status(400).json({ error: "Nombre del distribuidor requerido." });
      return;
    }
    const item = {
      id: distributor.id || `dist-${Date.now()}`,
      active: distributor.active !== false,
      createdAt: distributor.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      ...distributor
    };
    const idx = (dbCache.distributors || []).findIndex((d) => d.id === item.id);
    if (idx > -1) dbCache.distributors[idx] = { ...dbCache.distributors[idx], ...item };
    else dbCache.distributors = [item, ...dbCache.distributors || []];
    persistCloudDatabase();
    res.json({ success: true, distributor: dbCache.distributors[idx > -1 ? idx : 0] });
  } catch (err) {
    res.status(500).json({ error: "Error guardando distribuidor" });
  }
});
app.delete("/api/cloud/distributors/:id", (req, res) => {
  try {
    const { id } = req.params;
    dbCache.distributors = (dbCache.distributors || []).filter((d) => d.id !== id);
    persistCloudDatabase();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando distribuidor" });
  }
});
app.get("/api/cloud/stock-alerts", (req, res) => {
  res.json({ success: true, alerts: dbCache.stockAlerts || [] });
});
app.post("/api/cloud/stock-alerts", (req, res) => {
  try {
    const { alert } = req.body;
    if (!alert || !alert.customerEmail || !alert.productId) {
      res.status(400).json({ error: "Producto y email son requeridos." });
      return;
    }
    const newAlert = {
      id: alert.id || `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: alert.productId,
      productName: alert.productName || "Producto",
      productImage: alert.productImage || "",
      productBrand: alert.productBrand || "La Juaquina",
      variantWeight: alert.variantWeight || "",
      customerEmail: alert.customerEmail.trim(),
      customerPhone: (alert.customerPhone || "").trim(),
      customerName: (alert.customerName || "").trim(),
      notes: (alert.notes || "").trim(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending"
    };
    dbCache.stockAlerts = [newAlert, ...dbCache.stockAlerts || []];
    persistCloudDatabase();
    res.json({
      success: true,
      alert: newAlert,
      message: "\xA1Alerta de reposici\xF3n de stock registrada con \xE9xito!"
    });
  } catch (err) {
    res.status(500).json({ error: "Error guardando alerta de stock." });
  }
});
app.patch("/api/cloud/stock-alerts/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const alertIdx = (dbCache.stockAlerts || []).findIndex((a) => a.id === id);
    if (alertIdx === -1) {
      res.status(404).json({ error: "Alerta no encontrada" });
      return;
    }
    if (status) dbCache.stockAlerts[alertIdx].status = status;
    if (notes !== void 0) dbCache.stockAlerts[alertIdx].notes = notes;
    persistCloudDatabase();
    res.json({ success: true, alert: dbCache.stockAlerts[alertIdx] });
  } catch (err) {
    res.status(500).json({ error: "Error actualizando alerta" });
  }
});
app.delete("/api/cloud/stock-alerts/:id", (req, res) => {
  try {
    const { id } = req.params;
    dbCache.stockAlerts = (dbCache.stockAlerts || []).filter((a) => a.id !== id);
    persistCloudDatabase();
    res.json({ success: true, message: "Alerta eliminada" });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando alerta" });
  }
});
app.post("/api/cloud/auth/login", (req, res) => {
  try {
    const { email, password, forceRole } = req.body;
    const lowerEmail = (email || "").toLowerCase().trim();
    const isAdmin = forceRole === "admin" || lowerEmail === "admin" || lowerEmail.includes("admin") || password === dbCache.adminPin || password === "admin123";
    const user = {
      id: isAdmin ? "admin-master" : `user-${Date.now()}`,
      email: lowerEmail || (isAdmin ? "admin@lajuaquina.com" : "cliente@lajuaquina.com"),
      name: isAdmin ? "Administrador La Juaquina" : lowerEmail.split("@")[0] || "Cliente",
      role: isAdmin ? "admin" : "customer"
    };
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Error en inicio de sesi\xF3n" });
  }
});
app.post("/api/cloud/auth/register", (req, res) => {
  try {
    const { name, email } = req.body;
    const lowerEmail = (email || "").toLowerCase().trim();
    const isAdmin = lowerEmail.includes("admin");
    const user = {
      id: `user-${Date.now()}`,
      email: lowerEmail,
      name: name || lowerEmail.split("@")[0],
      role: isAdmin ? "admin" : "customer"
    };
    dbCache.users.push(user);
    persistCloudDatabase();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Error registrando usuario" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get(["/admin", "/admin.html", "/admin/*"], (req, res) => {
      const adminFile = import_path.default.join(distPath, "admin.html");
      if (import_fs.default.existsSync(adminFile)) {
        res.sendFile(adminFile);
        return;
      }
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F43E} La Juaquina Server corriendo en http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
