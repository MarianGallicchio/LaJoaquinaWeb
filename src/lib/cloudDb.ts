import { Product, OrderDetails, StockAlert, StoreSettings, Distributor } from '../types';
import { PRODUCTS as DEFAULT_PRODUCTS } from '../data/products';

export interface AuthUserProfile {
  id: string;
  email: string;
  name?: string;
  role?: 'admin' | 'customer';
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

// ============ SESIÓN ADMIN (token real del backend) ============

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
    provider: 'Cloud Cache Local (Respaldo offline)',
    version: '3.0',
    isOnline: false,
    productsCount: localProducts.length,
    ordersCount: localOrders.length,
  };
}

// Fetch products from Cloud Database (público)
export async function fetchCloudProducts(): Promise<Product[]> {
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

// Save or Update Product (solo admin, con token)
export async function saveCloudProduct(product: Product): Promise<Product> {
  const res = await fetch('/api/cloud/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ product }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
    throw new Error('No se pudo guardar el producto.');
  }
  const data = await res.json();
  if (data.product) syncLocalProduct(data.product);
  return data.product || product;
}

// Delete Product (solo admin)
export async function deleteCloudProduct(productId: string): Promise<boolean> {
  const res = await fetch(`/api/cloud/products/${productId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
    throw new Error('No se pudo eliminar el producto.');
  }
  removeLocalProduct(productId);
  return true;
}

// Reset Catalog (solo admin)
export async function resetCloudProducts(): Promise<Product[]> {
  const res = await fetch('/api/cloud/products/reset', {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
    throw new Error('No se pudo restablecer el catálogo.');
  }
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
  return DEFAULT_PRODUCTS;
}

// Save Order (público: lo usa el checkout de la tienda)
export async function saveCloudOrder(order: OrderDetails): Promise<OrderDetails> {
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
        return data.order;
      }
    }
  } catch (err) {
    console.warn('Network error saving order to cloud:', err);
  }

  saveOrderLocally(order);
  return order;
}

// Fetch Orders (solo admin)
export async function fetchCloudOrders(): Promise<OrderDetails[]> {
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
  if (res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
  return getStoredOrders();
}

// ============ STOCK ALERTS ============

export async function fetchCloudStockAlerts(): Promise<StockAlert[]> {
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
  if (res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
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
  const res = await fetch(`/api/cloud/stock-alerts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok && res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
  updateLocalStockAlert(id, status, notes);
  return true;
}

export async function deleteCloudStockAlert(id: string): Promise<boolean> {
  const res = await fetch(`/api/cloud/stock-alerts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok && res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
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

// ============ LOGIN ADMIN REAL (sin atajos) ============

export async function cloudLogin(email: string, password?: string): Promise<AuthUserProfile> {
  const res = await fetch('/api/cloud/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Credenciales inválidas.');
  }
  const data = await res.json();
  if (!data.user || !data.token) throw new Error('Respuesta de acceso inválida.');
  setAdminToken(data.token);
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
  return data.user;
}

// Verifica la sesión guardada contra el backend
export async function fetchAdminMe(): Promise<AuthUserProfile | null> {
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
    // Sin red: se mantiene la sesión guardada solo si existe token previo
    return getStoredUser();
  }
  return null;
}

// Cloud Register (público, siempre rol cliente)
export async function cloudRegister(name: string, email: string, password?: string): Promise<AuthUserProfile> {
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
): Promise<boolean> {
  const res = await fetch(`/api/cloud/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
    throw new Error('No se pudo actualizar el pedido.');
  }
  const data = await res.json();
  if (data.order) saveOrderLocally(data.order);
  else patchLocalOrder(orderId, patch);
  return true;
}

export async function deleteCloudOrder(orderId: string): Promise<boolean> {
  const res = await fetch(`/api/cloud/orders/${encodeURIComponent(orderId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
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
  const res = await fetch('/api/cloud/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
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

// ============ DISTRIBUIDORES MAYORISTAS (solo admin) ============

function getStoredDistributors(): Distributor[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DISTRIBUTORS);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function fetchCloudDistributors(): Promise<Distributor[]> {
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
  if (res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
  return getStoredDistributors();
}

export async function saveCloudDistributor(d: Distributor): Promise<Distributor> {
  const res = await fetch('/api/cloud/distributors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ distributor: d }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
    throw new Error('No se pudo guardar el distribuidor.');
  }
  const data = await res.json();
  if (data.distributor) syncLocalDistributor(data.distributor);
  return data.distributor || d;
}

export async function deleteCloudDistributor(id: string): Promise<boolean> {
  const res = await fetch(`/api/cloud/distributors/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión de administrador vencida. Volvé a ingresar.');
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

// ============ PAGOS MERCADO PAGO ============

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
  return data as MpPaymentResult;
}
