import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// ================= CLOUD DATABASE STORAGE =================
// Persistent server-side storage running directly in Cloud Run
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cloud_db.json');

interface CloudDbSchema {
  products: any[];
  orders: any[];
  users: Array<{ id: string; email: string; name: string; role: 'admin' | 'customer' }>;
  adminPin: string;
  stockAlerts: any[];
  settings: any | null;
  distributors: any[];
}

let dbCache: CloudDbSchema = {
  products: [],
  orders: [],
  users: [
    {
      id: 'admin-1',
      email: 'admin@lajuaquina.com',
      name: 'Administrador La Juaquina',
      role: 'admin',
    },
  ],
  adminPin: 'admin123',
  settings: null,
  distributors: [],
  stockAlerts: [
    {
      id: 'alert-sample-1',
      productId: 'piedras-silice-cristales',
      productName: 'Cristales de Sílice Perfumados Antibacterial',
      productBrand: 'SilicaGel Pet',
      variantWeight: '3.8 kg (7.6 L)',
      customerEmail: 'carolina.vet@gmail.com',
      customerPhone: '+54 9 11 4455-8899',
      customerName: 'Carolina V.',
      notes: 'Necesito 2 bolsas urgente para mis 3 gatos',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      status: 'pending',
    },
    {
      id: 'alert-sample-2',
      productId: 'perro-sabrosito-mix',
      productName: 'Sabrosito Mix Carne, Pollo y Cereales',
      productBrand: 'Sabrosito',
      variantWeight: '20 kg',
      customerEmail: 'marcelo.moreno@hotmail.com',
      customerPhone: '+54 9 11 6789-1234',
      customerName: 'Marcelo Gómez',
      notes: 'Avísenme por favor ni bien descarguen el camión',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      status: 'pending',
    }
  ],
};

function initCloudDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      dbCache = { 
        ...dbCache, 
        ...parsed,
        stockAlerts: Array.isArray(parsed.stockAlerts) ? parsed.stockAlerts : dbCache.stockAlerts,
        distributors: Array.isArray(parsed.distributors) ? parsed.distributors : dbCache.distributors,
      };
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('Error initializing cloud db file, using in-memory cache:', err);
  }
}


function persistCloudDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error persisting cloud db file:', err);
  }
}

initCloudDatabase();


// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return aiClient;
}

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    store: 'La Juaquina Pet Shop',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Smart AI Vet & Pet Shop Assistant
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'El mensaje es requerido.' });
      return;
    }

    const ai = getGemini();

    if (!ai) {
      // Fallback response if GEMINI_API_KEY is not yet attached
      const lower = message.toLowerCase();
      let reply = '¡Hola! 🐾 Soy JuaquiBot de La Juaquina Pet Shop. ¿En qué puedo asesorarte hoy con tu mascota?';
      if (lower.includes('cachorro') || lower.includes('perrito')) {
        reply = 'Para cachorros te recomendamos fórmulas ricas en calcio, proteínas de alta digestibilidad y DHA como **Dogui Cachorros** o **Raza Cachorros**. Ayudan al desarrollo cerebral y óseo. Podés comprarlo acá mismo en la tienda o pedirlo por Mercado Libre con envío rápido.';
      } else if (lower.includes('gato') || lower.includes('felino') || lower.includes('gatito')) {
        reply = 'Para felinos contamos con marcas de gran palatabilidad como **Cat Chow Defense Plus**, **Raza Castrados** (vital para proteger el tracto urinario) y **Sabrosito Gatos Delicias del Mar**. Además podés sumar nuestras piedras aglomerantes sin polvo.';
      } else if (lower.includes('piedra') || lower.includes('arena') || lower.includes('olor')) {
        reply = 'Para control de olores te sugerimos las **Piedras de Sílice en Cristales** (duran hasta 30 días) o las **Piedras Aglomerantes Ultra Clumping** de bentonita volcánica que hacen bloques sólidos instantáneos.';
      } else if (lower.includes('envio') || lower.includes('zona') || lower.includes('donde') || lower.includes('bella vista')) {
        reply = 'Somos una tienda 100% online con base en Bella Vista: enviamos en 24/48 hs a todo el AMBA, por Correo Argentino a todo el país, y además podés comprar nuestros combos directo en **Mercado Libre** con Mercado Envíos Full.';
      }
      res.json({ reply, source: 'fallback' });
      return;
    }

    const systemPrompt = `
Sos JuaquiBot, el asistente experto y empático de "La Juaquina Pet Shop", una tienda online argentina de mascotas, alimentos balanceados y accesorios con base en Bella Vista, Buenos Aires (solo online, sin local a la calle).
Tu misión es brindar atención cálida, entusiasta y muy útil a los amantes de las mascotas.
Envíos: despachamos desde Bella Vista a todo el AMBA en 24/48 hs y a todo el país por Correo Argentino y Mercado Envíos.

Catálogo de La Juaquina:
- Perros: Sabrosito Mix Carne y Pollo, Raza Mordida Chica, Dogui Cachorros con leche y DHA, Criadores Mantenimiento Adultos, Purina Dog Chow ExtraLife.
- Gatos: Sabrosito Delicias del Mar, Raza Gatos Castrados (control urinario y peso), Gati Carne y Arroz, Purina Cat Chow Defense Plus Castrados.
- Piedras sanitarias: Aglomerantes Ultra Clumping (bentonita volcánica sin polvo), Cristales de Sílice Perfumados (duran 30 días), Clásicas Absorbentes Super Ahorro.
- Accesorios: Cama Nube Antiestrés, Arnés Antitirón reflectivo, Comedero Antivoracidad Slow Feeder, Rascador Castillo con Cucha.
- Mascotas en Adopción: Promovemos la adopción responsable de perritos y gatitos rescatados con vacunas al día.
- Modalidad de compra: Los clientes pueden comprar directo en la tienda web con carrito (Mercado Pago, transferencia con 10% OFF o efectivo contra entrega) O comprar a través de Mercado Libre con Mercado Envíos a todo el país.

Tono de comunicación:
- Amable, argentino natural (usá modismos suaves y cordiales como "¡Hola!", "¡Claro!", "mirá", "fijate"), afectuoso con perros y gatos.
- Respuestas concisas, bien estructuradas con saltos de línea y negritas para facilitar la lectura en el chat.
- Siempre recordá consultar a un veterinario de confianza ante síntomas médicos graves.
`;

    // Format chat context if history is provided
    let conversationPrompt = '';
    if (Array.isArray(history) && history.length > 0) {
      conversationPrompt = history
        .slice(-6)
        .map((h: { sender: string; text: string }) => `${h.sender === 'user' ? 'Cliente' : 'JuaquiBot'}: ${h.text}`)
        .join('\n') + '\n';
    }
    conversationPrompt += `Cliente: ${message}\nJuaquiBot:`;

    let reply = '';
    try {
      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${systemPrompt}\n\nHistorial de chat:\n${conversationPrompt}`,
      });

      const timeoutPromise = new Promise<{ text?: string }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 7000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      reply = response.text || '';
    } catch {
      // Fallback pet response
      const lower = message.toLowerCase();
      if (lower.includes('cachorro') || lower.includes('perrito')) {
        reply = 'Para cachorros te recomendamos fórmulas ricas en calcio, proteínas digestibles y DHA como **Dogui Cachorros** o **Raza Cachorros**. Ayudan al desarrollo cerebral y óseo. Podés comprarlo acá mismo con carrito o pedirlo por Mercado Libre.';
      } else if (lower.includes('gato') || lower.includes('felino') || lower.includes('gatito')) {
        reply = 'Para felinos contamos con marcas de gran palatabilidad como **Cat Chow Defense Plus**, **Raza Castrados** (vital para proteger el tracto urinario) y **Sabrosito Gatos Delicias del Mar**.';
      } else if (lower.includes('piedra') || lower.includes('arena') || lower.includes('olor')) {
        reply = 'Para control de olores te sugerimos las **Piedras de Sílice en Cristales** (duran hasta 30 días) o las **Piedras Aglomerantes Ultra Clumping** de bentonita volcánica que hacen bloques sólidos instantáneos.';
      } else {
        reply = '¡Hola! 🐾 En La Juaquina tenemos alimentos balanceados (Sabrosito, Raza, Dogui, Criadores), piedras sanitarias y accesorios. Podés comprar directo en la web con 10% de descuento por transferencia o en nuestra tienda oficial de Mercado Libre.';
      }
    }

    res.json({ reply, source: reply ? 'gemini' : 'fallback' });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({
      reply: 'Tuvimos una pequeña intermitencia en el chat, pero podés consultarnos directamente por WhatsApp al +54 9 11 2345-6789 o consultar los productos en la tienda.',
      error: error?.message || 'Chat error',
    });
  }
});

// Process Order API (Integrated Cart Checkout & Cloud DB Storage)
app.post('/api/order', (req, res) => {
  try {
    const orderData = req.body;
    const orderId = orderData.orderId || `JQ-${Date.now().toString().slice(-6)}`;
    
    const orderSummary = {
      orderId,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      ...orderData,
    };

    // Save to Cloud DB
    dbCache.orders = [orderSummary, ...dbCache.orders.filter(o => o.orderId !== orderId)];
    persistCloudDatabase();

    res.json({
      success: true,
      order: orderSummary,
      message: `¡Tu pedido ${orderId} fue registrado con éxito en La Juaquina!`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error procesando la orden.' });
  }
});

// ================= CLOUD REST API =================

// 1. Health and Status
app.get('/api/cloud/status', (req, res) => {
  res.json({
    connected: true,
    provider: 'Cloud Database (Google Cloud Run Storage)',
    version: '2.1',
    productsCount: dbCache.products.length,
    ordersCount: dbCache.orders.length,
    usersCount: dbCache.users.length,
  });
});

// 2. Products - GET all
app.get('/api/cloud/products', (req, res) => {
  res.json({
    success: true,
    products: dbCache.products,
    count: dbCache.products.length,
  });
});

// 3. Products - POST (Create or Update)
app.post('/api/cloud/products', (req, res) => {
  try {
    const { product, products } = req.body;

    if (Array.isArray(products)) {
      // Bulk update
      dbCache.products = products;
      persistCloudDatabase();
      res.json({ success: true, count: dbCache.products.length });
      return;
    }

    if (!product || !product.id) {
      res.status(400).json({ error: 'Producto no válido.' });
      return;
    }

    const idx = dbCache.products.findIndex((p: any) => p.id === product.id);
    if (idx > -1) {
      dbCache.products[idx] = product;
    } else {
      dbCache.products.unshift(product);
    }

    persistCloudDatabase();
    res.json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error guardando producto' });
  }
});

// 4. Products - DELETE
app.delete('/api/cloud/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    dbCache.products = dbCache.products.filter((p: any) => p.id !== id);
    persistCloudDatabase();
    res.json({ success: true, message: 'Producto eliminado.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error eliminando producto' });
  }
});

// 5. Products - RESET
app.post('/api/cloud/products/reset', (req, res) => {
  try {
    dbCache.products = [];
    persistCloudDatabase();
    res.json({ success: true, message: 'Catálogo reseteado.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error reseteando catálogo' });
  }
});

// 6. Orders - GET & POST
app.get('/api/cloud/orders', (req, res) => {
  res.json({ success: true, orders: dbCache.orders });
});

app.post('/api/cloud/orders', (req, res) => {
  try {
    const { order } = req.body;
    if (!order) {
      res.status(400).json({ error: 'Orden requerida.' });
      return;
    }
    const orderId = order.orderId || `JQ-${Date.now().toString().slice(-6)}`;
    const newOrder = {
      ...order,
      orderId,
      createdAt: order.createdAt || new Date().toISOString(),
      status: order.status || 'pendiente',
    };
    dbCache.orders = [newOrder, ...dbCache.orders.filter((o: any) => o.orderId !== orderId)];
    persistCloudDatabase();
    res.json({ success: true, order: newOrder });
  } catch (err: any) {
    res.status(500).json({ error: 'Error guardando orden' });
  }
});

// 6b. Orders - PATCH status / tracking / admin notes (panel admin: ventas y envíos)
app.patch('/api/cloud/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const idx = dbCache.orders.findIndex((o: any) => o.orderId === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Pedido no encontrado.' });
      return;
    }
    const allowed = ['status', 'trackingCode', 'adminNotes'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) (dbCache.orders[idx] as any)[key] = req.body[key];
    }
    persistCloudDatabase();
    res.json({ success: true, order: dbCache.orders[idx] });
  } catch (err: any) {
    res.status(500).json({ error: 'Error actualizando pedido' });
  }
});

// 6c. Orders - DELETE (panel admin)
app.delete('/api/cloud/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    dbCache.orders = dbCache.orders.filter((o: any) => o.orderId !== id);
    persistCloudDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Error eliminando pedido' });
  }
});

// 6d. Store settings - GET & POST (comercio y envíos, compartido tienda/admin)
app.get('/api/cloud/settings', (req, res) => {
  res.json({ success: true, settings: dbCache.settings });
});

app.post('/api/cloud/settings', (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings) {
      res.status(400).json({ error: 'Configuración requerida.' });
      return;
    }
    dbCache.settings = { ...settings, updatedAt: new Date().toISOString() };
    persistCloudDatabase();
    res.json({ success: true, settings: dbCache.settings });
  } catch (err: any) {
    res.status(500).json({ error: 'Error guardando configuración' });
  }
});

// 6e. Distribuidores mayoristas - GET, POST (upsert) y DELETE
app.get('/api/cloud/distributors', (req, res) => {
  res.json({ success: true, distributors: dbCache.distributors || [] });
});

app.post('/api/cloud/distributors', (req, res) => {
  try {
    const { distributor, distributors } = req.body;
    if (Array.isArray(distributors)) {
      dbCache.distributors = distributors;
      persistCloudDatabase();
      res.json({ success: true, count: dbCache.distributors.length });
      return;
    }
    if (!distributor || !distributor.name) {
      res.status(400).json({ error: 'Nombre del distribuidor requerido.' });
      return;
    }
    const item = {
      id: distributor.id || `dist-${Date.now()}`,
      active: distributor.active !== false,
      createdAt: distributor.createdAt || new Date().toISOString(),
      ...distributor,
    };
    const idx = (dbCache.distributors || []).findIndex((d: any) => d.id === item.id);
    if (idx > -1) dbCache.distributors[idx] = { ...dbCache.distributors[idx], ...item };
    else dbCache.distributors = [item, ...(dbCache.distributors || [])];
    persistCloudDatabase();
    res.json({ success: true, distributor: dbCache.distributors[idx > -1 ? idx : 0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Error guardando distribuidor' });
  }
});

app.delete('/api/cloud/distributors/:id', (req, res) => {
  try {
    const { id } = req.params;
    dbCache.distributors = (dbCache.distributors || []).filter((d: any) => d.id !== id);
    persistCloudDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Error eliminando distribuidor' });
  }
});

// 7. Stock Alerts (Avisarme cuando haya stock)
app.get('/api/cloud/stock-alerts', (req, res) => {
  res.json({ success: true, alerts: dbCache.stockAlerts || [] });
});

app.post('/api/cloud/stock-alerts', (req, res) => {
  try {
    const { alert } = req.body;
    if (!alert || !alert.customerEmail || !alert.productId) {
      res.status(400).json({ error: 'Producto y email son requeridos.' });
      return;
    }

    const newAlert = {
      id: alert.id || `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: alert.productId,
      productName: alert.productName || 'Producto',
      productImage: alert.productImage || '',
      productBrand: alert.productBrand || 'La Juaquina',
      variantWeight: alert.variantWeight || '',
      customerEmail: alert.customerEmail.trim(),
      customerPhone: (alert.customerPhone || '').trim(),
      customerName: (alert.customerName || '').trim(),
      notes: (alert.notes || '').trim(),
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    dbCache.stockAlerts = [newAlert, ...(dbCache.stockAlerts || [])];
    persistCloudDatabase();

    res.json({
      success: true,
      alert: newAlert,
      message: '¡Alerta de reposición de stock registrada con éxito!',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error guardando alerta de stock.' });
  }
});

app.patch('/api/cloud/stock-alerts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const alertIdx = (dbCache.stockAlerts || []).findIndex((a: any) => a.id === id);
    if (alertIdx === -1) {
      res.status(404).json({ error: 'Alerta no encontrada' });
      return;
    }

    if (status) dbCache.stockAlerts[alertIdx].status = status;
    if (notes !== undefined) dbCache.stockAlerts[alertIdx].notes = notes;

    persistCloudDatabase();
    res.json({ success: true, alert: dbCache.stockAlerts[alertIdx] });
  } catch (err: any) {
    res.status(500).json({ error: 'Error actualizando alerta' });
  }
});

app.delete('/api/cloud/stock-alerts/:id', (req, res) => {
  try {
    const { id } = req.params;
    dbCache.stockAlerts = (dbCache.stockAlerts || []).filter((a: any) => a.id !== id);
    persistCloudDatabase();
    res.json({ success: true, message: 'Alerta eliminada' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error eliminando alerta' });
  }
});

// 8. Auth - Login & Admin Toggle
app.post('/api/cloud/auth/login', (req, res) => {
  try {
    const { email, password, forceRole } = req.body;
    const lowerEmail = (email || '').toLowerCase().trim();
    
    // Check if admin login is requested or PIN matches
    const isAdmin =
      forceRole === 'admin' ||
      lowerEmail === 'admin' ||
      lowerEmail.includes('admin') ||
      password === dbCache.adminPin ||
      password === 'admin123';

    const user = {
      id: isAdmin ? 'admin-master' : `user-${Date.now()}`,
      email: lowerEmail || (isAdmin ? 'admin@lajuaquina.com' : 'cliente@lajuaquina.com'),
      name: isAdmin ? 'Administrador La Juaquina' : (lowerEmail.split('@')[0] || 'Cliente'),
      role: isAdmin ? ('admin' as const) : ('customer' as const),
    };

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: 'Error en inicio de sesión' });
  }
});

// 8. Auth - Register
app.post('/api/cloud/auth/register', (req, res) => {
  try {
    const { name, email } = req.body;
    const lowerEmail = (email || '').toLowerCase().trim();
    const isAdmin = lowerEmail.includes('admin');
    
    const user = {
      id: `user-${Date.now()}`,
      email: lowerEmail,
      name: name || lowerEmail.split('@')[0],
      role: isAdmin ? ('admin' as const) : ('customer' as const),
    };

    // Store user
    dbCache.users.push(user);
    persistCloudDatabase();

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: 'Error registrando usuario' });
  }
});


async function startServer() {
  // Vite middleware in dev
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Entrada 2: panel administrador (admin.html)
    app.get(['/admin', '/admin.html', '/admin/*'], (req, res) => {
      const adminFile = path.join(distPath, 'admin.html');
      if (fs.existsSync(adminFile)) {
        res.sendFile(adminFile);
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
    // Entrada 1: tienda (index.html)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🐾 La Juaquina Server corriendo en http://localhost:${PORT}`);
  });
}

startServer();
