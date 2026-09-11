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

const STORAGE_KEY_PRODUCTS = 'la_joaquina_products_v2';
const STORAGE_KEY_ORDERS = 'la_juaquina_orders';
const STORAGE_KEY_USER = 'la_juaquina_user';
const STORAGE_KEY_ALERTS = 'la_juaquina_stock_alerts';
const STORAGE_KEY_DISTRIBUTORS = 'la_juaquina_distributors';
const STORAGE_KEY_ADMIN_TOKEN = 'la_juaquina_admin_token';

// Prioridad: 1) Supabase (nube compartida real), 2) backend /api (local o Vercel), 3) navegador.
export function supaMode(): boolean {
  return supa.supaIsConfigured();
}

let apiCache: { ok: boolean; at: number } | null = null;

async function apiUp(): Promise<boolean> {
  if (supaMode()) return false;
  const now = Date.now();
  if (apiCache && now - apiCache.at < 60000) return apiCache.ok;
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
    return localStorage.getItem(STORAGE_KEY_ADMIN_TOKEN);
  } catch {
    return null;
  }
}

function setAdminToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_TOKEN, token);
  } catch { /* ignore */ }
}

function clearAdminToken() {
  try {
    localStorage.removeItem(STORAGE_KEY_ADMIN_TOKEN);
  } catch { /* ignore */ }
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAdminToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

function getStoredUser(): AuthUserProfile | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
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
  if (supaMode()) {
    try {
      const saved = await supa.supaSaveOrder(order);
      saveOrderLocally(saved);
      markOrderTarget('ok');
      return saved;
    } catch (err) {
      console.warn('Supabase order error, guardando local:', err);
    }
    saveOrderLocally(order);
    markOrderTarget('local');
    return order;
  }
  if (!(await apiUp())) {
    saveOrderLocally(order);
    markOrderTarget('local');
    return order;
  }
  try {
    const res = await fetch('/api/cloud/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.order) {
        saveOrderLocally(data.order);
        markOrderTarget('ok');
        return data.order;
      }
    }
  } catch (err) {
    console.warn('Network error saving order to cloud:', err);
  }

  saveOrderLocally(order);
  markOrderTarget('local');
  return order;
}

// Fetch Orders (solo admin)
export async function fetchCloudOrders(): Promise<OrderDetails[]> {
  if (supaMode()) {
    const orders = await supa.supaGetOrders();
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    return orders;
  }
  const res = await fetch('/api/cloud/orders', {
    method: 'GET',
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (res.ok) {
    const data = await res.json();
    if (Array.isArray(data.orders)) {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(data.orders));
      return data.orders;
    }
  }
  if (res.status === 401) throw new Error('Sesión de administradora vencida. Volvé a ingresar.');
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
  if (supaMode()) {
    const me = await supa.supaMe().catch(() => null);
    if (me) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(me));
      return me;
    }
    return null;
  }
  const token = getAdminToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/cloud/auth/me', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        return data.user;
      }
    }
  } catch {
    return getStoredUser();
  }
  return null;
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

export async function customerLogin(email: string, password: string): Promise<AuthUserProfile> {
  if (supaMode()) {
    const u = await supa.supaLogin(email, password);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u));
    return u;
  }
  const profile: AuthUserProfile = {
    id: `user-${Date.now()}`,
    email: email.toLowerCase().trim(),
    name: email.split('@')[0] || 'Cliente',
    role: 'customer',
  };
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
  return profile;
}

export async function fetchMyOrders(email: string): Promise<OrderDetails[]> {
  const clean = (email || '').toLowerCase().trim();
  if (!clean) return [];
  if (supaMode()) return supa.supaMyOrders(clean);
  return getStoredOrders().filter((o) => (o.customerEmail || '').toLowerCase() === clean);
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

function getStoredOrders(): OrderDetails[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveOrderLocally(order: OrderDetails) {
  const current = getStoredOrders();
  const filtered = current.filter((o) => o.orderId !== order.orderId);
  filtered.unshift(order);
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(filtered));
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
  const updated = products.map((p) => {
    const itemsForProduct = order.items.filter((i) => i.product.id === p.id);
    if (itemsForProduct.length === 0) return p;
    return {
      ...p,
      variants: p.variants.map((v) => {
        const match = itemsForProduct.find((i) => i.selectedVariant.weight === v.weight);
        if (!match) return v;
        const current = typeof v.stock === 'number' ? v.stock : null;
        if (current === null) return v;
        const next = Math.max(0, current - match.quantity);
        return { ...v, stock: next, inStock: next > 0 };
      }),
    };
  });
  for (const prod of updated) {
    const orig = products.find((p) => p.id === prod.id);
    if (orig && JSON.stringify(orig) !== JSON.stringify(prod)) {
      try {
        await saveCloudProduct(prod);
      } catch (e) {
        console.warn('Stock local actualizado, nube pendiente:', e);
      }
    }
  }
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updated));
  } catch { /* ignore */ }
  return updated;
}

// Devuelve stock al cancelar un pedido (inverso del descuento por compra)
export async function restockForOrder(order: OrderDetails, products: Product[]): Promise<Product[]> {
  const updated = products.map((p) => {
    const itemsForProduct = order.items.filter((i) => i.product.id === p.id);
    if (itemsForProduct.length === 0) return p;
    return {
      ...p,
      variants: p.variants.map((v) => {
        const match = itemsForProduct.find((i) => i.selectedVariant.weight === v.weight);
        if (!match || typeof v.stock !== 'number') return v;
        const next = v.stock + match.quantity;
        return { ...v, stock: next, inStock: true };
      }),
    };
  });
  for (const prod of updated) {
    const orig = products.find((p) => p.id === prod.id);
    if (orig && JSON.stringify(orig) !== JSON.stringify(prod)) {
      await saveCloudProduct(prod);
    }
  }
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updated));
  } catch { /* ignore */ }
  return updated;
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

// ============ REALTIME (pedidos en vivo, solo Supabase) ============

export function subscribeOrdersLive(onInsert: (o: OrderDetails) => void): () => void {
  if (!supaMode()) return () => {};
  return supa.supaSubscribeOrders(onInsert);
}
