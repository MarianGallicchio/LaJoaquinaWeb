// Lógica de negocio pura: la usan tanto server.ts (local) como las
// funciones serverless de Vercel. Sin Express ni Request/Response aquí.
import { readDoc, writeDoc } from './db';
import { verifyAdminCredentials, issueAdminToken } from './auth';

const nowIso = () => new Date().toISOString();
const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ============ PRODUCTOS ============
export async function listProducts() {
  return readDoc<any[]>('products', []);
}

export async function upsertProduct(product: any) {
  if (!product || !product.id || !product.name) throw new Error('Producto no válido.');
  const list = await listProducts();
  const idx = list.findIndex((p: any) => p.id === product.id);
  const next = idx > -1 ? list.map((p: any, i: number) => (i === idx ? product : p)) : [product, ...list];
  await writeDoc('products', next);
  return product;
}

export async function replaceProducts(products: any[]) {
  await writeDoc('products', Array.isArray(products) ? products : []);
  return (Array.isArray(products) ? products : []).length;
}

export async function deleteProduct(id: string) {
  const list = await listProducts();
  await writeDoc('products', list.filter((p: any) => p.id !== id));
}

// ============ PEDIDOS ============
export type OrderStatus = 'pendiente' | 'pago_pendiente' | 'confirmado' | 'pagado' | 'preparando' | 'enviado' | 'entregado' | 'cancelado';

export async function listOrders() {
  return readDoc<any[]>('orders', []);
}

export async function createOrder(order: any) {
  if (!order || !Array.isArray(order.items)) throw new Error('Orden requerida.');
  const orderId = order.orderId || `JQ-${Date.now().toString().slice(-6)}`;
  const full = {
    ...order,
    orderId,
    createdAt: order.createdAt || nowIso(),
    status: order.status || 'pendiente',
  };
  const list = await listOrders();
  await writeDoc('orders', [full, ...list.filter((o: any) => o.orderId !== orderId)]);
  return full;
}

export async function patchOrder(id: string, patch: Record<string, any>) {
  const allowed = ['status', 'trackingCode', 'adminNotes'];
  const list = await listOrders();
  const idx = list.findIndex((o: any) => o.orderId === id);
  if (idx === -1) throw new Error('Pedido no encontrado.');
  for (const k of allowed) if (patch[k] !== undefined) list[idx][k] = patch[k];
  await writeDoc('orders', list);
  return list[idx];
}

export async function deleteOrder(id: string) {
  const list = await listOrders();
  await writeDoc('orders', list.filter((o: any) => o.orderId !== id));
}

// ============ ALERTAS DE STOCK ============
export async function listStockAlerts() {
  return readDoc<any[]>('stockAlerts', []);
}

export async function createStockAlert(alert: any) {
  if (!alert || !alert.productId || !alert.customerEmail) {
    throw new Error('Producto y email son requeridos.');
  }
  const full = {
    id: alert.id || uid('alert'),
    productId: alert.productId,
    productName: alert.productName || 'Producto',
    productImage: alert.productImage || '',
    productBrand: alert.productBrand || 'La Juaquina',
    variantWeight: alert.variantWeight || '',
    customerEmail: String(alert.customerEmail).trim(),
    customerPhone: String(alert.customerPhone || '').trim(),
    customerName: String(alert.customerName || '').trim(),
    notes: String(alert.notes || '').trim(),
    createdAt: nowIso(),
    status: 'pending',
  };
  const list = await listStockAlerts();
  await writeDoc('stockAlerts', [full, ...list]);
  return full;
}

export async function patchStockAlert(id: string, patch: Record<string, any>) {
  const list = await listStockAlerts();
  const idx = list.findIndex((a: any) => a.id === id);
  if (idx === -1) throw new Error('Alerta no encontrada.');
  if (patch.status) list[idx].status = patch.status;
  if (patch.notes !== undefined) list[idx].notes = patch.notes;
  await writeDoc('stockAlerts', list);
  return list[idx];
}

export async function deleteStockAlert(id: string) {
  const list = await listStockAlerts();
  await writeDoc('stockAlerts', list.filter((a: any) => a.id !== id));
}

// ============ DISTRIBUIDORES ============
export async function listDistributors() {
  return readDoc<any[]>('distributors', []);
}

export async function upsertDistributor(d: any) {
  if (!d || !d.name) throw new Error('Nombre del distribuidor requerido.');
  const item = {
    id: d.id || uid('dist'),
    active: d.active !== false,
    createdAt: d.createdAt || nowIso(),
    ...d,
  };
  const list = await listDistributors();
  const idx = list.findIndex((x: any) => x.id === item.id);
  const next = idx > -1 ? list.map((x: any, i: number) => (i === idx ? { ...x, ...item } : x)) : [item, ...list];
  await writeDoc('distributors', next);
  return next[idx > -1 ? idx : 0];
}

export async function deleteDistributor(id: string) {
  const list = await listDistributors();
  await writeDoc('distributors', list.filter((d: any) => d.id !== id));
}

// ============ CONFIGURACIÓN ============
export async function getSettings() {
  return readDoc<any | null>('settings', null);
}

export async function saveSettings(settings: any) {
  if (!settings) throw new Error('Configuración requerida.');
  const full = { ...settings, updatedAt: nowIso() };
  await writeDoc('settings', full);
  return full;
}

// ============ AUTH ============
export async function loginAdmin(email: string, password: string) {
  const profile = verifyAdminCredentials(email, password);
  if (!profile) return null;
  return { user: profile, token: issueAdminToken(profile) };
}

export async function registerCustomer(name: string, email: string) {
  const clean = String(email || '').toLowerCase().trim();
  const profile = { id: uid('user'), email: clean, name: name || clean.split('@')[0] || 'Cliente', role: 'customer' as const };
  const users = await readDoc<any[]>('users', []);
  await writeDoc('users', [...users, profile]);
  return profile;
}

// ============ CHAT (Gemini con fallbacks honestos, sin ML) ============
let aiClient: any = null;
async function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!aiClient) {
    const { GoogleGenAI } = await import('@google/genai');
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

function fallbackReply(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('cachorro') || lower.includes('perrito')) {
    return 'Para cachorros te recomendamos fórmulas ricas en calcio, proteínas digestibles y DHA como **Dogui Cachorros** o **Raza Cachorros**. Podés comprarlo acá mismo con envío a todo el país.';
  }
  if (lower.includes('gato') || lower.includes('felino') || lower.includes('gatito') || lower.includes('castrado')) {
    return 'Para felinos contamos con **Cat Chow Defense Plus**, **Raza Castrados** (protege el tracto urinario) y **Sabrosito Delicias del Mar**. Si tu gato está castrado, priorizá fórmulas para castrados.';
  }
  if (lower.includes('piedra') || lower.includes('arena') || lower.includes('olor')) {
    return 'Para control de olores te sugerimos las **Piedras de Sílice** (duran hasta 30 días) o las **Aglomerantes Ultra Clumping** que forman bloques sólidos al instante.';
  }
  if (lower.includes('envio') || lower.includes('envío') || lower.includes('zona') || lower.includes('donde') || lower.includes('bella vista') || lower.includes('tardan') || lower.includes('llega')) {
    return 'Somos una tienda 100% online con base en Bella Vista: enviamos en 24/48 hs a todo el AMBA y por Correo Argentino a todo el país.';
  }
  if (lower.includes('pago') || lower.includes('pagar') || lower.includes('tarjeta') || lower.includes('transferencia') || lower.includes('cuota') || lower.includes('descuento') || lower.includes('cupon') || lower.includes('cupón')) {
    return 'Aceptamos **Mercado Pago** (tarjetas y dinero en cuenta, con link de pago seguro), **transferencia bancaria con 10% OFF** y **efectivo** contra entrega. Además el cupón de la tienda te da descuento extra en el carrito.';
  }
  if (lower.includes('precio') || lower.includes('cuanto') || lower.includes('cuánto') || lower.includes('costo')) {
    return 'Podés ver todos los precios actualizados en el catálogo de la tienda, con presentaciones por kilo y promociones marcadas. Sumá al carrito y el total se calcula solo.';
  }
  return '¡Hola! 🐾 En La Juaquina tenemos alimentos balanceados, piedras sanitarias y accesorios con envío a todo el país. Preguntame por nutrición, envíos, pagos o contame qué mascota tenés.';
}

export async function chatReply(message: string, history: Array<{ sender: string; text: string }>) {
  if (!message || typeof message !== 'string') throw new Error('El mensaje es requerido.');
  const ai = await getGemini().catch(() => null);
  if (!ai) return { reply: fallbackReply(message), source: 'local' as const };

  const systemPrompt = [
    'Sos JuaquiBot, asistente de "La Juaquina Pet Shop", tienda online argentina de mascotas con base en Bella Vista, Buenos Aires (solo online, sin local).',
    'Vendés SOLO por esta web con carrito: Mercado Pago online, transferencia con 10% OFF o efectivo. Envíos desde Bella Vista a todo AMBA en 24/48 hs y al país por Correo Argentino.',
    'NO menciones Mercado Libre: no vendemos por ahí.',
    'Tono argentino cordial, respuestas cortas con negritas. Ante síntomas graves, derivá a un veterinario.',
  ].join('\n');

  try {
    const convo = (Array.isArray(history) ? history.slice(-6) : [])
      .map((h) => `${h.sender === 'user' ? 'Cliente' : 'JuaquiBot'}: ${h.text}`)
      .join('\n');
    const response = (await Promise.race([
      ai.models.generateContent({ model: 'gemini-2.0-flash', contents: `${systemPrompt}\n\n${convo}\nCliente: ${message}\nJuaquiBot:` }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 8000)),
    ])) as any;
    const text = response.text || '';
    if (!text.trim()) return { reply: fallbackReply(message), source: 'local' as const };
    return { reply: text, source: 'gemini' as const };
  } catch {
    return { reply: fallbackReply(message), source: 'local' as const };
  }
}

// ============ MERCADO PAGO ============
export function mpConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

export async function createMpPreference(order: any, baseUrl: string) {
  if (!mpConfigured()) throw new Error('Cobro online no configurado.');
  const { MercadoPagoConfig, Preference } = await import('mercadopago');
  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN as string });
  const items = (order.items || []).map((it: any, i: number) => ({
    id: `${order.orderId}-${i}`,
    title: `${it.product?.name || 'Producto'} (${it.selectedVariant?.weight || ''})`.slice(0, 250),
    quantity: Number(it.quantity) || 1,
    unit_price: Number(it.selectedVariant?.price) || 0,
    currency_id: 'ARS',
  }));
  // Ajuste por descuentos: se cargan como ítem negativo para que el total coincida
  if (order.discount > 0) {
    items.push({ id: `${order.orderId}-desc`, title: 'Descuentos aplicados', quantity: 1, unit_price: -Math.round(Number(order.discount)), currency_id: 'ARS' });
  }
  if (order.shippingCost > 0) {
    items.push({ id: `${order.orderId}-envio`, title: 'Costo de envío', quantity: 1, unit_price: Math.round(Number(order.shippingCost)), currency_id: 'ARS' });
  }
  const preference = new Preference(client);
  const res = await preference.create({
    body: {
      items,
      payer: {
        name: order.customerName,
        email: order.customerEmail || undefined,
        phone: order.customerPhone ? { number: String(order.customerPhone) } : undefined,
      },
      back_urls: {
        success: `${baseUrl}/?pago=exito&pedido=${order.orderId}`,
        failure: `${baseUrl}/?pago=fallo&pedido=${order.orderId}`,
        pending: `${baseUrl}/?pago=pendiente&pedido=${order.orderId}`,
      },
      auto_return: 'approved',
      notification_url: `${baseUrl}/api/payments/webhook`,
      external_reference: order.orderId,
      statement_descriptor: 'LA JUAQUINA',
    },
  });
  return { preferenceId: res.id, initPoint: res.init_point };
}

export async function handleMpWebhook(query: Record<string, any>, body: Record<string, any>) {
  // Mercado Pago notifica con ?id=PAYMENT_ID&topic=payment (o type=payment)
  const paymentId = query.id || query['data.id'] || body?.data?.id;
  const topic = query.topic || query.type || body?.type;
  if (!paymentId || (topic && topic !== 'payment' && topic !== 'merchant_order')) {
    return { ok: false as const, reason: 'not-a-payment' };
  }
  if (!mpConfigured()) return { ok: false as const, reason: 'mp-not-configured' };
  const { MercadoPagoConfig, Payment } = await import('mercadopago');
  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN as string });
  const payment = new Payment(client);
  const info: any = await payment.get({ id: String(paymentId) });
  const orderId = info.external_reference;
  if (!orderId) return { ok: false as const, reason: 'no-external-reference' };
  if (info.status === 'approved') {
    await patchOrder(orderId, { status: 'pagado' });
    return { ok: true as const, orderId, status: 'pagado' };
  }
  return { ok: true as const, orderId, status: info.status };
}
