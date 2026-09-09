// Servidor local de desarrollo. Usa el MISMO núcleo (api/_lib/core.ts) que las
// funciones serverless de Vercel, así local y producción se comportan igual.
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { adminFromAuthHeader } from './api/_lib/auth';
import * as core from './api/_lib/core';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

function needAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const profile = adminFromAuthHeader(req.headers.authorization);
  if (!profile) {
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }
  (req as any).admin = profile;
  next();
}

const ok = (res: express.Response, data: any) => res.json(data);
const fail = (res: express.Response, e: any, status = 400) =>
  res.status(status).json({ error: e?.message || 'Error en el servidor.' });

// ================= SALUD Y CHAT =================
app.get('/api/health', async (req, res) => {
  const [products, orders] = await Promise.all([core.listProducts(), core.listOrders()]);
  ok(res, {
    status: 'ok',
    store: 'La Juaquina Pet Shop',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    paymentsConfigured: core.mpConfigured(),
    productsCount: products.length,
    ordersCount: orders.length,
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    ok(res, await core.chatReply(message, history));
  } catch (e: any) {
    res.status(500).json({
      reply: 'Tuvimos una intermitencia en el chat. Escribinos por WhatsApp y te ayudamos enseguida.',
      error: e?.message || 'Chat error',
    });
  }
});

// ================= PEDIDO DIRECTO (compat) =================
app.post('/api/order', async (req, res) => {
  try {
    const saved = await core.createOrder(req.body);
    ok(res, { success: true, order: saved, message: `¡Tu pedido ${saved.orderId} fue registrado con éxito!` });
  } catch (e: any) {
    fail(res, e, 500);
  }
});

// ================= CLOUD API =================
app.get('/api/cloud/status', async (req, res) => {
  const [products, orders] = await Promise.all([core.listProducts(), core.listOrders()]);
  ok(res, {
    connected: true,
    provider: 'La Juaquina Cloud DB',
    version: '3.0',
    productsCount: products.length,
    ordersCount: orders.length,
  });
});

// Productos
app.get('/api/cloud/products', async (req, res) => {
  const products = await core.listProducts();
  ok(res, { success: true, products, count: products.length });
});

app.post('/api/cloud/products', needAdmin, async (req, res) => {
  try {
    const { product, products } = req.body;
    if (Array.isArray(products)) {
      const count = await core.replaceProducts(products);
      ok(res, { success: true, count });
      return;
    }
    ok(res, { success: true, product: await core.upsertProduct(product) });
  } catch (e: any) {
    fail(res, e);
  }
});

app.delete('/api/cloud/products/:id', needAdmin, async (req, res) => {
  await core.deleteProduct(req.params.id);
  ok(res, { success: true, message: 'Producto eliminado.' });
});

app.post('/api/cloud/products/reset', needAdmin, async (req, res) => {
  await core.replaceProducts([]);
  ok(res, { success: true, message: 'Catálogo reseteado.', products: [] });
});

// Pedidos
app.get('/api/cloud/orders', needAdmin, async (req, res) => {
  ok(res, { success: true, orders: await core.listOrders() });
});

app.post('/api/cloud/orders', async (req, res) => {
  try {
    const { order } = req.body;
    ok(res, { success: true, order: await core.createOrder(order) });
  } catch (e: any) {
    fail(res, e);
  }
});

app.patch('/api/cloud/orders/:id', needAdmin, async (req, res) => {
  try {
    ok(res, { success: true, order: await core.patchOrder(req.params.id, req.body) });
  } catch (e: any) {
    fail(res, e, 404);
  }
});

app.delete('/api/cloud/orders/:id', needAdmin, async (req, res) => {
  await core.deleteOrder(req.params.id);
  ok(res, { success: true });
});

// Configuración
app.get('/api/cloud/settings', async (req, res) => {
  ok(res, { success: true, settings: await core.getSettings() });
});

app.post('/api/cloud/settings', needAdmin, async (req, res) => {
  try {
    ok(res, { success: true, settings: await core.saveSettings(req.body.settings) });
  } catch (e: any) {
    fail(res, e);
  }
});

// Distribuidores
app.get('/api/cloud/distributors', needAdmin, async (req, res) => {
  ok(res, { success: true, distributors: await core.listDistributors() });
});

app.post('/api/cloud/distributors', needAdmin, async (req, res) => {
  try {
    const { distributor, distributors } = req.body;
    if (Array.isArray(distributors)) {
      const { writeDoc } = await import('./api/_lib/db');
      await writeDoc('distributors', distributors);
      ok(res, { success: true, count: distributors.length });
      return;
    }
    ok(res, { success: true, distributor: await core.upsertDistributor(distributor) });
  } catch (e: any) {
    fail(res, e);
  }
});

app.delete('/api/cloud/distributors/:id', needAdmin, async (req, res) => {
  await core.deleteDistributor(req.params.id);
  ok(res, { success: true });
});

// Alertas de stock
app.get('/api/cloud/stock-alerts', needAdmin, async (req, res) => {
  ok(res, { success: true, alerts: await core.listStockAlerts() });
});

app.post('/api/cloud/stock-alerts', async (req, res) => {
  try {
    const saved = await core.createStockAlert(req.body.alert);
    ok(res, { success: true, alert: saved, message: '¡Alerta registrada con éxito!' });
  } catch (e: any) {
    fail(res, e);
  }
});

app.patch('/api/cloud/stock-alerts/:id', needAdmin, async (req, res) => {
  try {
    ok(res, { success: true, alert: await core.patchStockAlert(req.params.id, req.body) });
  } catch (e: any) {
    fail(res, e, 404);
  }
});

app.delete('/api/cloud/stock-alerts/:id', needAdmin, async (req, res) => {
  await core.deleteStockAlert(req.params.id);
  ok(res, { success: true, message: 'Alerta eliminada' });
});

// Auth
app.post('/api/cloud/auth/login', async (req, res) => {
  const { adminConfigured } = await import('./api/_lib/auth');
  if (!adminConfigured()) {
    res.status(503).json({ error: 'Acceso de administrador no configurado. Definí ADMIN_PASSWORD en el servidor.' });
    return;
  }
  const { email, password } = req.body;
  const result = await core.loginAdmin(email, password);
  if (!result) {
    res.status(401).json({ error: 'Credenciales inválidas.' });
    return;
  }
  ok(res, { success: true, user: result.user, token: result.token });
});

app.post('/api/cloud/auth/register', async (req, res) => {
  const { name, email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email requerido.' });
    return;
  }
  ok(res, { success: true, user: await core.registerCustomer(name, email) });
});

app.get('/api/cloud/auth/me', async (req, res) => {
  const profile = adminFromAuthHeader(req.headers.authorization);
  if (!profile) {
    res.status(401).json({ error: 'Sesión inválida.' });
    return;
  }
  ok(res, { success: true, user: profile });
});

// Pagos Mercado Pago
app.post('/api/payments/create', async (req, res) => {
  if (!core.mpConfigured()) {
    res.status(503).json({ error: 'El cobro online no está configurado. Elegí transferencia o coordiná por WhatsApp.' });
    return;
  }
  try {
    const base = (process.env.BACKEND_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
    const saved = await core.createOrder({ ...req.body.order, status: 'pago_pendiente' });
    const pref = await core.createMpPreference(saved, base);
    ok(res, { success: true, order: saved, initPoint: pref.initPoint, preferenceId: pref.preferenceId });
  } catch (e: any) {
    fail(res, e);
  }
});

app.all('/api/payments/webhook', async (req, res) => {
  try {
    const query: Record<string, any> = req.query as any;
    const result = await core.handleMpWebhook(query, req.body || {});
    ok(res, { success: true, ...result });
  } catch (e: any) {
    ok(res, { success: false, error: e?.message || 'Webhook error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    // En dev, servir los HTML a través de Vite para que aplique transforms
    app.get('/', async (req, res, next) => {
      try {
        const html = await vite.transformIndexHtml(req.originalUrl, fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8'));
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
    app.get('/admin.html', async (req, res, next) => {
      try {
        const html = await vite.transformIndexHtml(req.originalUrl, fs.readFileSync(path.join(process.cwd(), 'admin.html'), 'utf-8'));
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get(['/admin', '/admin.html', '/admin/*'], (req, res) => {
      const adminFile = path.join(distPath, 'admin.html');
      if (fs.existsSync(adminFile)) {
        res.sendFile(adminFile);
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🐾 La Juaquina Server corriendo en http://localhost:${PORT}`);
  });
}

startServer();
