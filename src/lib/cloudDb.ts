import { Product, OrderDetails, StockAlert, StoreSettings, Distributor, CustomerProfileData, emptyCustomerProfile } from '../types';
import { PRODUCTS as DEFAULT_PRODUCTS } from '../data/products';
import * as supa from './supabase';

export interface AuthUserProfile {
  id: string;
  email: string;
  name?: string;
  role?: 'admin' | 'customer' | 'stock' | 'ventas';
  isOwner?: boolean;
}

export interface CloudDbStatus {
  connected: boolean;
  provider: string;
  version: string;
  isOnline: boolean;
  productsCount: number;
  ordersCount: number;
}

export const STORAGE_KEY_PRODUCTS = 'la_joaquina_products_v2';
export const STORAGE_KEY_ORDERS = 'la_joaquina_orders';
export const STORAGE_KEY_USER = 'la_joaquina_user';
export const STORAGE_KEY_ALERTS = 'la_joaquina_stock_alerts';
export const STORAGE_KEY_DISTRIBUTORS = 'la_joaquina_distributors';
export const STORAGE_KEY_ADMIN_TOKEN = 'la_joaquina_admin_token';

// Canal para sincronización bidireccional en tiempo real entre pestañas (tienda y panel admin)
export const joaquinaSyncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('la_joaquina_sync') : null;

export function broadcastSync(type: 'order_created' | 'order_updated' | 'products_updated', detail?: any) {
  try {
    joaquinaSyncChannel?.postMessage({ type, detail, timestamp: Date.now() });
  } catch { /* ignore */ }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('la_joaquina_last_sync', `${type}_${Date.now()}`);
    }
  } catch { /* ignore */ }
}

export function playOrderNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Tono 1 (D5 ~ 587Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tono 2 (A5 ~ 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch {
    // Si el navegador bloquea audio antes de interacción del usuario, ignorar silenciosamente
  }
}

// Prioridad: 1) Supabase (nube compartida real), 2) backend /api (local o Vercel), 3) navegador.
export function supaMode(): boolean {
  return supa.supaIsConfigured();
}

let apiCache: { ok: boolean; at: number } | null = null;

async function apiUp(): Promise<boolean> {
  if (supaMode()) return false;
  const now = Date.now();
  if (apiCache && now - apiCache.at < 15000) return apiCache.ok;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch('/api/health', { signal: ctrl.signal });
    clearTimeout(t);
    const j = await r.json().catch(() => null);
    apiCache = { ok: r.ok && !!j && j.status === 'ok', at: now };
  } catch {
    apiCache = { ok: false, at: now };
  }
  return apiCache.ok;
}

// ============ SESIÓN ADMIN ============

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ADMIN_TOKEN) || localStorage.getItem('la_juaquina_admin_token');
  } catch {
    return null;
  }
}

export function setAdminToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_TOKEN, token);
    localStorage.setItem('la_juaquina_admin_token', token);
  } catch { /* ignore */ }
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(STORAGE_KEY_ADMIN_TOKEN);
    localStorage.removeItem('la_juaquina_admin_token');
  } catch { /* ignore */ }
}

export function decodeTokenPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      let b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) {
        b64 += '=';
      }
      const json = atob(b64);
      return JSON.parse(json);
    }
  } catch {
    return null;
  }
  return null;
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAdminToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

function getStoredUser(): AuthUserProfile | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USER) || localStorage.getItem('la_juaquina_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

// Check Cloud Database connectivity
export async function checkCloudDbStatus(): Promise<CloudDbStatus> {
  if (supaMode()) {
    try {
      const [p, o] = await Promise.all([supa.supaGetProducts(), supa.supaGetOrders()]);
      return { connected: true, provider: 'Supabase (nube compartida)', version: '3.1', isOnline: true, productsCount: p.length, ordersCount: o.length };
    } catch {
      return { connected: false, provider: 'Supabase (sin conexión)', version: '3.1', isOnline: false, productsCount: 0, ordersCount: 0 };
    }
  }
  try {
    const res = await fetch('/api/cloud/status', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        connected: true,
        provider: data.provider || 'La Joaquina Cloud DB',
        version: data.version || '3.0',
        isOnline: true,
        productsCount: data.productsCount || 0,
        ordersCount: data.ordersCount || 0,
      };
    }
  } catch (e) {
    console.warn('Could not reach /api/cloud/status, falling back to local cloud cache', e);
  }

  const localProducts = getStoredProducts();
  const localOrders = getStoredOrders();
  return {
    connected: true,
    provider: 'Solo este navegador (sin nube)',
    version: '3.1',
    isOnline: false,
    productsCount: localProducts.length,
    ordersCount: localOrders.length,
  };
}

// Fetch products (público)
export async function fetchCloudProducts(): Promise<Product[]> {
  if (supaMode()) {
    try {
      const list = await supa.supaGetProducts();
      if (list.length > 0) {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(list));
        return list;
      }
    } catch (err) {
      console.warn('Supabase products error, usando caché:', err);
    }
    return getStoredProducts();
  }
  if (!(await apiUp())) return getStoredProducts();
  try {
    const res = await fetch('/api/cloud/products', {
      method: 'GET',
      headers: { Accept: 'application/json', ...authHeaders() },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(data.products));
        return data.products;
      }
    }
  } catch (err) {
    console.warn('Fetch cloud products network error, using cached products:', err);
  }

  return getStoredProducts();
}

// Save or Update Product (solo admin)
export async function saveCloudProduct(product: Product): Promise<Product> {
  if (supaMode()) {
    const saved = await supa.supaSaveProduct(product);
    syncLocalProduct(saved);
    return saved;
  }
  const res = await fetch('/api/cloud/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ product }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
    throw new Error('No se pudo guardar el producto.');
  }
  const data = await res.json();
  if (data.product) syncLocalProduct(data.product);
  return data.product || product;
}

// Delete Product (solo admin)
export async function deleteCloudProduct(productId: string): Promise<boolean> {
  if (supaMode()) {
    await supa.supaDeleteProduct(productId);
    removeLocalProduct(productId);
    return true;
  }
  const res = await fetch(`/api/cloud/products/${productId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
    throw new Error('No se pudo eliminar el producto.');
  }
  removeLocalProduct(productId);
  return true;
}

// Reset Catalog (solo admin)
export async function resetCloudProducts(): Promise<Product[]> {
  if (supaMode()) {
    await supa.supaReplaceProducts(DEFAULT_PRODUCTS);
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }
  const res = await fetch('/api/cloud/products/reset', {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
    throw new Error('No se pudo restablecer el catálogo.');
  }
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
  return DEFAULT_PRODUCTS;
}

// Dónde quedó guardado el último pedido (para mostrarlo en el checkout)
export type SaveTarget = 'ok' | 'local';
let lastOrderTarget: SaveTarget | null = null;
export function getLastOrderTarget(): SaveTarget | null {
  return lastOrderTarget;
}
function markOrderTarget(t: SaveTarget) {
  lastOrderTarget = t;
}

// Save Order (público: lo usa el checkout de la tienda)
export async function saveCloudOrder(order: OrderDetails): Promise<OrderDetails> {
  // Garantizar estructura válida, sanitizada y con tipos correctos para el backend
  const formattedOrder: OrderDetails = {
    orderId: order.orderId || `JQ-${Math.floor(100000 + Math.random() * 900000)}`,
    customerId: order.customerId,
    customerName: (order.customerName || '').trim() || 'Cliente Anónimo',
    customerPhone: (order.customerPhone || '').trim(),
    customerEmail: (order.customerEmail || '').trim().toLowerCase(),
    deliveryMethod: order.deliveryMethod || 'pickup',
    address: order.address || 'Retiro en local',
    notes: order.notes || '',
    paymentMethod: order.paymentMethod || 'efectivo',
    items: Array.isArray(order.items)
      ? order.items.map((i) => ({
          product: {
            id: i.product?.id || '',
            name: i.product?.name || 'Producto',
            brand: i.product?.brand || '',
            category: i.product?.category || 'otros',
            image: i.product?.image || '',
            variants: i.product?.variants || [],
            rating: i.product?.rating || 5,
            reviewsCount: i.product?.reviewsCount || 0,
            description: i.product?.description || '',
            mercadolibreQuery: i.product?.mercadolibreQuery || '',
          } as any,
          selectedVariant: {
            weight: i.selectedVariant?.weight || '',
            price: Number(i.selectedVariant?.price) || 0,
            inStock: i.selectedVariant?.inStock !== false,
            stock: typeof i.selectedVariant?.stock === 'number' ? i.selectedVariant.stock : undefined,
          },
          quantity: Math.max(1, Number(i.quantity) || 1),
        }))
      : [],
    subtotal: Number(order.subtotal) || 0,
    discount: Number(order.discount) || 0,
    shippingCost: Number(order.shippingCost) || 0,
    total: Number(order.total) || 0,
    status: order.status || 'pendiente',
    createdAt: order.createdAt || new Date().toISOString(),
    trackingCode: order.trackingCode || '',
    adminNotes: order.adminNotes || '',
    history: order.history || [],
  };

  console.log('[saveCloudOrder] Iniciando guardado de orden:', formattedOrder.orderId, {
    itemsCount: formattedOrder.items.length,
    total: formattedOrder.total,
    email: formattedOrder.customerEmail,
  });

  if (supaMode()) {
    try {
      console.log('[saveCloudOrder] Guardando en Supabase...');
      const saved = await supa.supaSaveOrder(formattedOrder);
      saveOrderLocally(saved);
      markOrderTarget('ok');
      console.log('[saveCloudOrder] Guardado exitoso en Supabase:', saved.orderId);
      return saved;
    } catch (err) {
      console.error('[saveCloudOrder] Error al guardar en Supabase:', err);
    }
  }

  // Enviar a la API cloud del backend (/api/cloud/orders)
  try {
    console.log('[saveCloudOrder] Enviando a /api/cloud/orders...');
    const res = await fetch('/api/cloud/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: formattedOrder }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.order) {
        console.log('[saveCloudOrder] Pedido confirmado por /api/cloud/orders:', data.order.orderId);
        saveOrderLocally(data.order);
        markOrderTarget('ok');
        return data.order;
      }
    } else {
      const text = await res.text();
      console.error(`[saveCloudOrder] Error HTTP ${res.status} en /api/cloud/orders:`, text);
    }
  } catch (err) {
    console.error('[saveCloudOrder] Error de red en /api/cloud/orders:', err);
  }

  // Fallback endpoint directo (/api/order)
  try {
    console.warn('[saveCloudOrder] Intentando fallback en /api/order para pedido:', formattedOrder.orderId);
    const res2 = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedOrder),
    });

    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.order) {
        console.log('[saveCloudOrder] Pedido confirmado por fallback /api/order:', data2.order.orderId);
        saveOrderLocally(data2.order);
        markOrderTarget('ok');
        return data2.order;
      }
    } else {
      const text2 = await res2.text();
      console.error(`[saveCloudOrder] Error HTTP ${res2.status} en fallback /api/order:`, text2);
    }
  } catch (err2) {
    console.error('[saveCloudOrder] Error de red en fallback /api/order:', err2);
  }

  // Fallback local como última instancia
  console.warn('[saveCloudOrder] Guardando orden en almacenamiento local (fallback offline):', formattedOrder.orderId);
  saveOrderLocally(formattedOrder);
  markOrderTarget('local');
  return formattedOrder;
}

// Fetch Orders (solo admin)
export async function fetchCloudOrders(): Promise<OrderDetails[]> {
  if (supaMode()) {
    try {
      const orders = await supa.supaGetOrders();
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
      return orders;
    } catch (err) {
      console.warn('[fetchCloudOrders] Error leyendo pedidos de Supabase, usando local:', err);
      return getStoredOrders();
    }
  }

  try {
    const res = await fetch('/api/cloud/orders', {
      method: 'GET',
      headers: { Accept: 'application/json', ...authHeaders() },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        // Combinar pedidos del servidor con pedidos locales pendientes de sincronización
        const local = getStoredOrders();
        const map = new Map<string, OrderDetails>();

        // 1. Priorizar pedidos del servidor
        for (const o of data.orders) {
          if (o && o.orderId) map.set(o.orderId, o);
        }

        // 2. Si hay pedidos locales que aún no llegaron al servidor, conservarlos y sincronizarlos
        for (const loc of local) {
          if (loc && loc.orderId && !map.has(loc.orderId)) {
            map.set(loc.orderId, loc);
            // Sincronizar en segundo plano al backend
            fetch('/api/cloud/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order: loc }),
            }).catch(() => {});
          }
        }

        const merged = Array.from(map.values());
        try {
          localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(merged));
        } catch { /* ignore */ }
        return merged;
      }
    } else {
      console.warn(`[fetchCloudOrders] Respuesta HTTP ${res.status} al obtener pedidos.`);
    }
  } catch (err) {
    console.warn('[fetchCloudOrders] Error de conexión al consultar pedidos:', err);
  }

  return getStoredOrders();
}

// ============ STOCK ALERTS ============

export async function fetchCloudStockAlerts(): Promise<StockAlert[]> {
  if (supaMode()) {
    const alerts = await supa.supaGetAlerts();
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));
    return alerts;
  }
  const res = await fetch('/api/cloud/stock-alerts', {
    method: 'GET',
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (res.ok) {
    const data = await res.json();
    if (Array.isArray(data.alerts)) {
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(data.alerts));
      return data.alerts;
    }
  }
  if (res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
  return getStoredStockAlerts();
}

export async function createCloudStockAlert(
  alertData: Omit<StockAlert, 'id' | 'createdAt' | 'status'>
): Promise<StockAlert> {
  const newAlert: StockAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...alertData,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  if (supaMode()) {
    try {
      const saved = await supa.supaCreateAlert(newAlert);
      saveLocalStockAlert(saved);
      return saved;
    } catch (err) {
      console.warn('Supabase alert error, guardando local:', err);
    }
    saveLocalStockAlert(newAlert);
    return newAlert;
  }
  if (!(await apiUp())) {
    saveLocalStockAlert(newAlert);
    return newAlert;
  }
  try {
    const res = await fetch('/api/cloud/stock-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert: newAlert }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.alert) {
        saveLocalStockAlert(data.alert);
        return data.alert;
      }
    }
  } catch (err) {
    console.warn('Error saving stock alert to cloud, saving locally:', err);
  }

  saveLocalStockAlert(newAlert);
  return newAlert;
}

export async function updateCloudStockAlertStatus(
  id: string,
  status: 'pending' | 'notified' | 'resolved',
  notes?: string
): Promise<boolean> {
  if (supaMode()) {
    const patch: Record<string, any> = { status };
    if (notes !== undefined) patch.notes = notes;
    await supa.supaPatchAlert(id, patch);
    updateLocalStockAlert(id, status, notes);
    return true;
  }
  const res = await fetch(`/api/cloud/stock-alerts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok && res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
  updateLocalStockAlert(id, status, notes);
  return true;
}

export async function deleteCloudStockAlert(id: string): Promise<boolean> {
  if (supaMode()) {
    await supa.supaDeleteAlert(id);
    deleteLocalStockAlert(id);
    return true;
  }
  const res = await fetch(`/api/cloud/stock-alerts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok && res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
  deleteLocalStockAlert(id);
  return true;
}

function getStoredStockAlerts(): StockAlert[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ALERTS);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveLocalStockAlert(alert: StockAlert) {
  try {
    const alerts = getStoredStockAlerts();
    const updated = [alert, ...alerts.filter((a) => a.id !== alert.id)];
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error saving local alert', e);
  }
}

function updateLocalStockAlert(id: string, status: 'pending' | 'notified' | 'resolved', notes?: string) {
  try {
    const alerts = getStoredStockAlerts();
    const updated = alerts.map((a) => (a.id === id ? { ...a, status, ...(notes !== undefined ? { notes } : {}) } : a));
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error updating local alert', e);
  }
}

function deleteLocalStockAlert(id: string) {
  try {
    const alerts = getStoredStockAlerts();
    const updated = alerts.filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error deleting local alert', e);
  }
}

// ============ LOGIN (dueña: Supabase Auth o backend, nunca atajos) ============

export async function cloudLogin(email: string, password?: string): Promise<AuthUserProfile> {
  if (supaMode()) {
    const user = await supa.supaLogin(email, password || '');
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return user;
  }
  let res: Response;
  try {
    res = await fetch('/api/cloud/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error('Sin conexión con el servidor. El panel admin necesita el backend: local con npm run dev o tu URL de Vercel/Supabase.');
  }
  const text = await res.text().catch(() => '');
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok || !data) {
    if (res.status === 404 || !data) {
      throw new Error('Acá no hay backend: esta copia es solo archivos estáticos. Usá el admin donde corre el servidor (local o Vercel).');
    }
    throw new Error(data.error || 'Credenciales inválidas.');
  }
  if (!data.user || !data.token) throw new Error('Respuesta de acceso inválida.');
  setAdminToken(data.token);
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
  return data.user;
}

// Verifica la sesión guardada
export async function fetchAdminMe(): Promise<AuthUserProfile | null> {
  const diag = await checkAdminSession();
  return diag.user;
}

export interface SessionCheckResult {
  valid: boolean;
  status: 'valid' | 'expired' | 'invalid' | 'no_token' | 'server_unreachable';
  user: AuthUserProfile | null;
  expiresAt: Date | null;
  detail: string;
}

// Diagnóstico detallado del token y sesión de administrador
export async function checkAdminSession(): Promise<SessionCheckResult> {
  if (supaMode()) {
    try {
      const { data, error } = await supa.supa().auth.getSession();
      if (error) {
        return {
          valid: false,
          status: 'invalid',
          user: null,
          expiresAt: null,
          detail: `Error en sesión de Supabase: ${error.message}`,
        };
      }
      const session = data?.session;
      if (!session) {
        const stored = getStoredUser();
        if (stored && stored.role !== 'customer') {
          return {
            valid: false,
            status: 'expired',
            user: null,
            expiresAt: null,
            detail: 'La sesión de Supabase expiró o fue cerrada.',
          };
        }
        return {
          valid: false,
          status: 'no_token',
          user: null,
          expiresAt: null,
          detail: 'No hay sesión de Supabase iniciada.',
        };
      }
      const exp = session.expires_at ? new Date(session.expires_at * 1000) : null;
      if (exp && exp.getTime() < Date.now()) {
        return {
          valid: false,
          status: 'expired',
          user: null,
          expiresAt: exp,
          detail: `Sesión de Supabase expirada el ${exp.toLocaleTimeString('es-AR')}.`,
        };
      }
      const profile = await supa.supaMe().catch(() => null);
      if (!profile || profile.role === 'customer') {
        return {
          valid: false,
          status: 'invalid',
          user: null,
          expiresAt: exp,
          detail: 'La cuenta conectada no posee permisos de administrador.',
        };
      }
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
      return {
        valid: true,
        status: 'valid',
        user: profile,
        expiresAt: exp,
        detail: 'Sesión de Supabase activa y validada.',
      };
    } catch (e: any) {
      return {
        valid: false,
        status: 'server_unreachable',
        user: getStoredUser(),
        expiresAt: null,
        detail: e?.message || 'No se pudo contactar a Supabase para verificar sesión.',
      };
    }
  }

  // Backend Express nativo
  const token = getAdminToken();
  if (!token) {
    return {
      valid: false,
      status: 'no_token',
      user: null,
      expiresAt: null,
      detail: 'No se encontró token de sesión en el navegador.',
    };
  }

  let expiresAt: Date | null = null;
  const payload = decodeTokenPayload(token);
  if (payload) {
    if (payload.exp) {
      expiresAt = new Date(payload.exp);
      if (Date.now() > payload.exp) {
        clearAdminToken();
        localStorage.removeItem(STORAGE_KEY_USER);
        return {
          valid: false,
          status: 'expired',
          user: null,
          expiresAt,
          detail: `El token de sesión expiró el ${expiresAt.toLocaleString('es-AR')}.`,
        };
      }
    }
    if (payload.role && payload.role !== 'admin') {
      clearAdminToken();
      localStorage.removeItem(STORAGE_KEY_USER);
      return {
        valid: false,
        status: 'invalid',
        user: null,
        expiresAt,
        detail: 'El token no corresponde a una cuenta con rol de administrador.',
      };
    }
  }

  try {
    const res = await fetch('/api/cloud/auth/me', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      clearAdminToken();
      localStorage.removeItem(STORAGE_KEY_USER);
      return {
        valid: false,
        status: 'invalid',
        user: null,
        expiresAt,
        detail: 'El servidor rechazó el token (sesión vencida, firma inválida o token revocado).',
      };
    }

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        return {
          valid: true,
          status: 'valid',
          user: data.user,
          expiresAt,
          detail: 'Sesión activa y confirmada por el servidor.',
        };
      }
    }

    return {
      valid: false,
      status: 'invalid',
      user: null,
      expiresAt,
      detail: `El servidor devolvió respuesta de autenticación anómala (${res.status}).`,
    };
  } catch (err: any) {
    // Si no hay conexión con el servidor
    const stored = getStoredUser();
    return {
      valid: !!stored,
      status: 'server_unreachable',
      user: stored,
      expiresAt,
      detail: 'Sin conexión con el servidor para validar el token (modo sin conexión).',
    };
  }
}

export interface BackendHealthResult {
  connected: boolean;
  provider: string;
  backendType: 'supabase' | 'custom_express';
  latencyMs: number;
  productsCount?: number;
  ordersCount?: number;
  error?: string;
  detail: string;
  timestamp: Date;
}

// Diagnóstico de conectividad en segundo plano (Supabase o Custom Express)
export async function checkBackendHealth(): Promise<BackendHealthResult> {
  const start = performance.now();
  if (supaMode()) {
    try {
      const diag = await supa.supaDiagnostics();
      const latency = Math.round(performance.now() - start);
      return {
        connected: diag.reachable && diag.tables,
        provider: 'Supabase Cloud (PostgreSQL)',
        backendType: 'supabase',
        latencyMs: latency,
        error: !diag.reachable || !diag.tables ? diag.detail : undefined,
        detail: diag.detail,
        timestamp: new Date(),
      };
    } catch (e: any) {
      const latency = Math.round(performance.now() - start);
      return {
        connected: false,
        provider: 'Supabase Cloud',
        backendType: 'supabase',
        latencyMs: latency,
        error: e?.message || 'Error al conectar con Supabase',
        detail: 'Fallo de conexión a Supabase',
        timestamp: new Date(),
      };
    }
  }

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('/api/cloud/status', {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    const latency = Math.round(performance.now() - start);
    if (res.ok) {
      const json = await res.json().catch(() => null);
      return {
        connected: true,
        provider: json?.provider || 'Servidor Express (La Joaquina Cloud)',
        backendType: 'custom_express',
        latencyMs: latency,
        productsCount: json?.productsCount,
        ordersCount: json?.ordersCount,
        detail: `Servidor Express activo (${json?.productsCount ?? 0} prod, ${json?.ordersCount ?? 0} pedidos) · ${latency}ms`,
        timestamp: new Date(),
      };
    } else {
      return {
        connected: false,
        provider: 'Servidor Express',
        backendType: 'custom_express',
        latencyMs: latency,
        error: `HTTP ${res.status}: ${res.statusText || 'Error en servidor'}`,
        detail: `El servidor respondió con error HTTP ${res.status}`,
        timestamp: new Date(),
      };
    }
  } catch (e: any) {
    const latency = Math.round(performance.now() - start);
    const isTimeout = e?.name === 'AbortError';
    const errText = isTimeout ? 'Tiempo de espera agotado (>5s)' : (e?.message || 'Servidor no accesible');
    return {
      connected: false,
      provider: 'Servidor Express',
      backendType: 'custom_express',
      latencyMs: latency,
      error: errText,
      detail: `Fallo silencioso de conexión: ${errText}`,
      timestamp: new Date(),
    };
  }
}

// ============ CUENTAS DE CLIENTES (registro libre + historial) ============
export async function customerRegister(name: string, email: string, password: string): Promise<AuthUserProfile> {
  if (supaMode()) {
    const u = await supa.supaRegisterCustomer(name, email, password);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u));
    return u;
  }
  return cloudRegister(name, email, password);
}

export async function customerLogin(email: string, password?: string): Promise<AuthUserProfile> {
  const clean = (email || '').toLowerCase().trim();
  if (supaMode()) {
    const u = await supa.supaLogin(clean, password || '');
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u));
    return u;
  }
  // Si se ingresó contraseña, verificar si son credenciales del administrador
  if (password) {
    try {
      const admin = await cloudLogin(clean, password);
      if (admin && admin.role === 'admin') {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(admin));
        return admin;
      }
    } catch {
      // Si falló verificación admin, continúa como cliente
    }
  }
  const profile: AuthUserProfile = {
    id: `user-${Date.now()}`,
    email: clean,
    name: clean.split('@')[0] || 'Cliente',
    role: 'customer',
  };
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
  return profile;
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!supaMode()) throw new Error('Recuperación disponible solo con la nube conectada.');
  return supa.supaRequestReset(email);
}

export async function fetchMyOrders(email: string): Promise<OrderDetails[]> {
  const clean = (email || '').toLowerCase().trim();
  if (!clean) return [];
  if (supaMode()) return supa.supaMyOrders(clean);

  // Consultar al backend
  let backendOrders: OrderDetails[] = [];
  try {
    const res = await fetch(`/api/cloud/my-orders?email=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        backendOrders = data.orders;
      }
    }
  } catch (err) {
    console.warn('Error fetching my orders from cloud:', err);
  }

  const localOrders = getStoredOrders().filter((o) => (o.customerEmail || '').toLowerCase() === clean);
  // Unificar sin duplicados
  const map = new Map<string, OrderDetails>();
  for (const o of localOrders) map.set(o.orderId, o);
  for (const o of backendOrders) map.set(o.orderId, o);
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Cloud Register (clientes: solo perfil local, sin contraseñas ni usuarios Auth)
export async function cloudRegister(name: string, email: string, password?: string): Promise<AuthUserProfile> {
  if (supaMode()) {
    const profile: AuthUserProfile = {
      id: `user-${Date.now()}`,
      email: email.toLowerCase().trim(),
      name: name || email.split('@')[0],
      role: 'customer',
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
    return profile;
  }
  if (!(await apiUp())) {
    const profile: AuthUserProfile = {
      id: `user-${Date.now()}`,
      email: email.toLowerCase().trim(),
      name: name || email.split('@')[0],
      role: 'customer',
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
    return profile;
  }
  const res = await fetch('/api/cloud/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) throw new Error('No se pudo crear la cuenta.');
  const data = await res.json();
  if (!data.user) throw new Error('Respuesta de registro inválida.');
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
  return data.user;
}

// Cloud Logout
export async function cloudLogout(): Promise<void> {
  if (supaMode()) await supa.supaLogout();
  try {
    localStorage.removeItem(STORAGE_KEY_USER);
    clearAdminToken();
  } catch (e) {
    console.warn('Could not clear local user:', e);
  }
}

// Helpers for localStorage

function getStoredProducts(): Product[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

function syncLocalProduct(product: Product) {
  const current = getStoredProducts();
  const index = current.findIndex((p) => p.id === product.id);
  if (index > -1) {
    current[index] = product;
  } else {
    current.unshift(product);
  }
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(current));
}

function removeLocalProduct(productId: string) {
  const current = getStoredProducts().filter((p) => p.id !== productId);
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(current));
}

export function getStoredOrders(): OrderDetails[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ORDERS) || localStorage.getItem('la_juaquina_orders');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveOrderLocally(order: OrderDetails) {
  const current = getStoredOrders();
  const filtered = current.filter((o) => o.orderId !== order.orderId);
  filtered.unshift(order);
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(filtered));
  } catch { /* ignore */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('joaquina:order_created', { detail: order }));
  }
  // Notificar a otras pestañas y ventanas abiertas (admin o tienda)
  broadcastSync('order_created', order);
}

// ============ ORDER STATUS (Admin: ventas y envíos) ============

export async function updateCloudOrderStatus(
  orderId: string,
  patch: Partial<Pick<OrderDetails, 'status' | 'trackingCode' | 'adminNotes' | 'history'>>
): Promise<{ ok: boolean; order?: OrderDetails; whatsappSent?: boolean }> {
  if (supaMode()) {
    const allowed: Record<string, any> = {};
    for (const k of ['status', 'trackingCode', 'adminNotes', 'history'] as const) {
      if ((patch as any)[k] !== undefined) allowed[k] = (patch as any)[k];
    }
    const order = await supa.supaPatchOrder(orderId, allowed);
    saveOrderLocally(order);
    return { ok: true, order, whatsappSent: false };
  }
  const res = await fetch(`/api/cloud/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
    throw new Error('No se pudo actualizar el pedido.');
  }
  const data = await res.json();
  const { whatsappSent, ...clean } = data.order || {};
  if (data.order) saveOrderLocally(clean as OrderDetails);
  else patchLocalOrder(orderId, patch);
  return { ok: true, order: clean as OrderDetails, whatsappSent: !!whatsappSent };
}

export async function deleteCloudOrder(orderId: string): Promise<boolean> {
  if (supaMode()) {
    await supa.supaDeleteOrder(orderId);
    removeLocalOrder(orderId);
    return true;
  }
  const res = await fetch(`/api/cloud/orders/${encodeURIComponent(orderId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
    throw new Error('No se pudo eliminar el pedido.');
  }
  removeLocalOrder(orderId);
  return true;
}

function patchLocalOrder(orderId: string, patch: Partial<OrderDetails>) {
  try {
    const orders = getStoredOrders().map((o) => (o.orderId === orderId ? { ...o, ...patch } : o));
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.warn('Error patching local order', e);
  }
}

function removeLocalOrder(orderId: string) {
  try {
    const orders = getStoredOrders().filter((o) => o.orderId !== orderId);
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.warn('Error removing local order', e);
  }
}

// ============ STORE SETTINGS ============

export async function fetchCloudSettings(): Promise<StoreSettings | null> {
  if (supaMode()) {
    try {
      return await supa.supaGetSettings();
    } catch (e) {
      console.warn('Supabase settings error:', e);
      return null;
    }
  }
  if (!(await apiUp())) return null;
  try {
    const res = await fetch('/api/cloud/settings', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      return data.settings || null;
    }
  } catch (e) {
    console.warn('Fetch settings network error:', e);
  }
  return null;
}

export async function saveCloudSettings(settings: StoreSettings): Promise<StoreSettings> {
  if (supaMode()) return supa.supaSaveSettings(settings);
  const res = await fetch('/api/cloud/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
    throw new Error('No se pudo guardar la configuración.');
  }
  const data = await res.json();
  return data.settings || settings;
}

// Decrementa stock luego de una compra (tienda -> admin)
export async function decrementStockForOrder(order: OrderDetails, products: Product[]): Promise<Product[]> {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    console.warn('[decrementStockForOrder] Orden sin items o vacía. No se modifica stock:', order);
    return products;
  }

  console.log('[decrementStockForOrder] Descontando stock para pedido:', order.orderId, 'Items a procesar:', order.items.length);

  try {
    const updated = products.map((p) => {
      const itemsForProduct = order.items.filter((i) => i.product && i.product.id === p.id);
      if (itemsForProduct.length === 0) return p;
      return {
        ...p,
        variants: p.variants.map((v) => {
          const match = itemsForProduct.find((i) => {
            const varW = (v.weight || '').trim().toLowerCase();
            const itemW = (i.selectedVariant?.weight || '').trim().toLowerCase();
            if (varW && itemW && varW === itemW) return true;
            return i.selectedVariant?.price === v.price;
          });
          if (!match) return v;
          const current = typeof v.stock === 'number' ? v.stock : null;
          if (current === null) return v;
          const qty = Number(match.quantity) || 1;
          const next = Math.max(0, current - qty);
          console.log(`[decrementStockForOrder] Producto "${p.name}" (${v.weight}): stock ${current} -> ${next}`);
          return { ...v, stock: next, inStock: next > 0 };
        }),
      };
    });

    if (supaMode()) {
      for (const prod of updated) {
        const orig = products.find((p) => p.id === prod.id);
        if (orig && JSON.stringify(orig) !== JSON.stringify(prod)) {
          try {
            await supa.supaSaveProduct(prod);
            console.log('[decrementStockForOrder] Producto sincronizado con Supabase:', prod.id);
          } catch (e) {
            console.error('[decrementStockForOrder] Error al actualizar producto en Supabase:', e);
          }
        }
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updated));
      console.log('[decrementStockForOrder] Stock actualizado guardado en cache local.');
    } catch (storageErr) {
      console.error('[decrementStockForOrder] Error guardando productos en localStorage:', storageErr);
    }

    return updated;
  } catch (err) {
    console.error('[decrementStockForOrder] Error fatal durante el descuento de stock:', err);
    return products;
  }
}

// Devuelve stock al cancelar un pedido (inverso del descuento por compra)
export async function restockForOrder(order: OrderDetails, products: Product[]): Promise<Product[]> {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return products;
  }
  console.log('[restockForOrder] Reponiendo stock para pedido cancelado:', order.orderId);
  try {
    const updated = products.map((p) => {
      const itemsForProduct = order.items.filter((i) => i.product && i.product.id === p.id);
      if (itemsForProduct.length === 0) return p;
      return {
        ...p,
        variants: p.variants.map((v) => {
          const match = itemsForProduct.find((i) => {
            const varW = (v.weight || '').trim().toLowerCase();
            const itemW = (i.selectedVariant?.weight || '').trim().toLowerCase();
            if (varW && itemW && varW === itemW) return true;
            return i.selectedVariant?.price === v.price;
          });
          if (!match || typeof v.stock !== 'number') return v;
          const qty = Number(match.quantity) || 1;
          const next = v.stock + qty;
          console.log(`[restockForOrder] Repuesto "${p.name}" (${v.weight}): stock ${v.stock} -> ${next}`);
          return { ...v, stock: next, inStock: true };
        }),
      };
    });

    if (supaMode()) {
      for (const prod of updated) {
        const orig = products.find((p) => p.id === prod.id);
        if (orig && JSON.stringify(orig) !== JSON.stringify(prod)) {
          try {
            await supa.supaSaveProduct(prod);
          } catch (e) {
            console.error('[restockForOrder] Error sincronizando producto en Supabase:', e);
          }
        }
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updated));
    } catch { /* ignore */ }

    return updated;
  } catch (err) {
    console.error('[restockForOrder] Error fatal durante reposición de stock:', err);
    return products;
  }
}

// ============ DISTRIBUIDORES (solo admin) ============

function getStoredDistributors(): Distributor[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DISTRIBUTORS);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function fetchCloudDistributors(): Promise<Distributor[]> {
  if (supaMode()) {
    const list = await supa.supaGetDistributors();
    localStorage.setItem(STORAGE_KEY_DISTRIBUTORS, JSON.stringify(list));
    return list;
  }
  const res = await fetch('/api/cloud/distributors', {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (res.ok) {
    const data = await res.json();
    if (Array.isArray(data.distributors)) {
      localStorage.setItem(STORAGE_KEY_DISTRIBUTORS, JSON.stringify(data.distributors));
      return data.distributors;
    }
  }
  if (res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
  return getStoredDistributors();
}

export async function saveCloudDistributor(d: Distributor): Promise<Distributor> {
  if (supaMode()) {
    const saved = await supa.supaSaveDistributor(d);
    syncLocalDistributor(saved);
    return saved;
  }
  const res = await fetch('/api/cloud/distributors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ distributor: d }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
    throw new Error('No se pudo guardar el distribuidor.');
  }
  const data = await res.json();
  if (data.distributor) syncLocalDistributor(data.distributor);
  return data.distributor || d;
}

export async function deleteCloudDistributor(id: string): Promise<boolean> {
  if (supaMode()) {
    await supa.supaDeleteDistributor(id);
    removeLocalDistributor(id);
    return true;
  }
  const res = await fetch(`/api/cloud/distributors/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
    throw new Error('No se pudo eliminar el distribuidor.');
  }
  removeLocalDistributor(id);
  return true;
}

function syncLocalDistributor(d: Distributor) {
  try {
    const current = getStoredDistributors();
    const idx = current.findIndex((x) => x.id === d.id);
    if (idx > -1) current[idx] = d;
    else current.unshift(d);
    localStorage.setItem(STORAGE_KEY_DISTRIBUTORS, JSON.stringify(current));
  } catch (e) {
    console.warn('Error syncing local distributor', e);
  }
}

function removeLocalDistributor(id: string) {
  try {
    const current = getStoredDistributors().filter((x) => x.id !== id);
    localStorage.setItem(STORAGE_KEY_DISTRIBUTORS, JSON.stringify(current));
  } catch (e) {
    console.warn('Error removing local distributor', e);
  }
}

// ============ PERFIL DE CLIENTE (direcciones, pagos, favoritos) ============

const STORAGE_KEY_CUSTOMER = 'la_joaquina_customer_profile';

function customerKey(user: { id?: string; email: string }): string {
  const id = (user.id || user.email || '').toLowerCase().trim() || 'anon';
  return `${STORAGE_KEY_CUSTOMER}_${id}`;
}

function loadLocalCustomerProfile(user: { id?: string; email: string; name?: string }): CustomerProfileData | null {
  try {
    const saved = localStorage.getItem(customerKey(user));
    return saved ? (JSON.parse(saved) as CustomerProfileData) : null;
  } catch {
    return null;
  }
}

function saveLocalCustomerProfile(user: { id?: string; email: string }, data: CustomerProfileData) {
  try {
    localStorage.setItem(customerKey(user), JSON.stringify(data));
  } catch { /* ignore */ }
}

export async function fetchCustomerProfile(user: { id?: string; email: string; name?: string }): Promise<CustomerProfileData> {
  const base = { ...emptyCustomerProfile(user.email, user.name || ''), ...(loadLocalCustomerProfile(user) || {}) };
  if (!supaMode()) return base;
  try {
    const remote = await supa.supaGetProfile();
    if (remote) {
      saveLocalCustomerProfile(user, remote);
      return remote;
    }
  } catch (e) {
    console.warn('Perfil remoto no disponible, usando local:', e);
  }
  return base;
}

export async function saveCustomerProfile(
  user: { id?: string; email: string },
  data: CustomerProfileData
): Promise<CustomerProfileData> {
  saveLocalCustomerProfile(user, data);
  if (supaMode()) {
    try {
      return await supa.supaSaveProfile(data);
    } catch (e) {
      console.warn('Perfil guardado solo local:', e);
    }
  }
  return data;
}

// ============ EQUIPO Y CLAVE (Supabase; el backend local no lo soporta) ============

export async function fetchStaff(): Promise<import('./supabase').StaffRow[]> {
  if (!supaMode()) throw new Error('El equipo solo está disponible con la nube conectada.');
  return supa.supaGetStaff();
}

export async function saveStaff(row: import('./supabase').StaffRow): Promise<import('./supabase').StaffRow> {
  if (!supaMode()) throw new Error('El equipo solo está disponible con la nube conectada.');
  return supa.supaSaveStaff(row);
}

export async function deleteStaff(email: string): Promise<void> {
  if (!supaMode()) throw new Error('El equipo solo está disponible con la nube conectada.');
  return supa.supaDeleteStaff(email);
}

export async function changeMyPassword(newPassword: string): Promise<void> {
  if (!supaMode()) throw new Error('El cambio de clave solo está disponible con la nube conectada.');
  return supa.supaChangePassword(newPassword);
}

// ============ PEDIDO POR EMAIL (llega al instante, sin backend) ============

export async function sendOrderEmail(order: OrderDetails, to: string): Promise<boolean> {
  try {
    const clean = (to || '').trim();
    if (!clean || !clean.includes('@')) return false;
    const items = (order.items || [])
      .map((i) => `${i.product.name} (${i.selectedVariant.weight}) x${i.quantity} = $${(i.selectedVariant.price * i.quantity).toLocaleString('es-AR')}`)
      .join('\n');
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(clean)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `Nuevo pedido ${order.orderId} - La Joaquina Pet Shop ($${Number(order.total || 0).toLocaleString('es-AR')})`,
        _template: 'table',
        Pedido: order.orderId,
        Fecha: order.createdAt,
        Estado: order.status || 'pendiente',
        Cliente: order.customerName,
        Telefono: order.customerPhone,
        Email: order.customerEmail || '-',
        Entrega: order.deliveryMethod === 'pickup' ? 'Entrega coordinada' : order.address,
        Pago: order.paymentMethod,
        Productos: items,
        Subtotal: `$${Number(order.subtotal || 0).toLocaleString('es-AR')}`,
        Descuento: `$${Number(order.discount || 0).toLocaleString('es-AR')}`,
        Envio: `$${Number(order.shippingCost || 0).toLocaleString('es-AR')}`,
        Total: `$${Number(order.total || 0).toLocaleString('es-AR')}`,
        Notas: order.notes || '-',
        Seguimiento: order.trackingCode || '-',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ============ PAGOS MERCADO PAGO (requiere backend con token) ============

export interface MpPaymentResult {
  order: OrderDetails;
  initPoint: string;
  preferenceId: string;
}

export async function createMpPayment(order: OrderDetails): Promise<MpPaymentResult> {
  let res: Response;
  try {
    res = await fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
  } catch {
    throw new Error('Sin conexión con el servidor de pagos. Elegí transferencia o coordiná por WhatsApp.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo generar el link de pago.');
  saveOrderLocally(data.order);
  markOrderTarget('ok');
  return data as MpPaymentResult;
}

// ============ REALTIME (pedidos en vivo: Supabase + backend + eventos de ventana) ============

export function subscribeOrdersLive(onInsert: (o: OrderDetails) => void): () => void {
  if (supaMode()) {
    return supa.supaSubscribeOrders(onInsert);
  }

  const handleOrderCreated = (e: Event) => {
    const detail = (e as CustomEvent<OrderDetails>).detail;
    if (detail) onInsert(detail);
  };

  const handleStorage = (e: StorageEvent) => {
    if ((e.key === STORAGE_KEY_ORDERS || e.key === 'la_juaquina_orders') && e.newValue) {
      try {
        const list: OrderDetails[] = JSON.parse(e.newValue);
        if (Array.isArray(list) && list.length > 0) {
          onInsert(list[0]);
        }
      } catch { /* ignore */ }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('joaquina:order_created', handleOrderCreated);
    window.addEventListener('storage', handleStorage);
  }

  // Polling automático cada 8s para sincronizar ventas realizadas en otros dispositivos
  let lastOrderId: string | null = null;
  const pollTimer = setInterval(async () => {
    try {
      const orders = await fetchCloudOrders();
      if (orders.length > 0) {
        const newest = orders[0];
        if (lastOrderId && newest.orderId !== lastOrderId) {
          onInsert(newest);
        }
        lastOrderId = newest.orderId;
      }
    } catch { /* ignore */ }
  }, 8000);

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('joaquina:order_created', handleOrderCreated);
      window.removeEventListener('storage', handleStorage);
    }
    clearInterval(pollTimer);
  };
}
