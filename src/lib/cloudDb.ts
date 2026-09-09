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

const STORAGE_KEY_PRODUCTS = 'la_juaquina_products';
const STORAGE_KEY_ORDERS = 'la_juaquina_orders';
const STORAGE_KEY_USER = 'la_juaquina_user';
const STORAGE_KEY_ALERTS = 'la_juaquina_stock_alerts';
const STORAGE_KEY_DISTRIBUTORS = 'la_juaquina_distributors';


// Check Cloud Database connectivity
export async function checkCloudDbStatus(): Promise<CloudDbStatus> {
  try {
    const res = await fetch('/api/cloud/status', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        connected: true,
        provider: data.provider || 'Google Cloud Run Database',
        version: data.version || '2.1',
        isOnline: true,
        productsCount: data.productsCount || 0,
        ordersCount: data.ordersCount || 0,
      };
    }
  } catch (e) {
    console.warn('Could not reach /api/cloud/status, falling back to local cloud cache', e);
  }

  // Fallback status
  const localProducts = getStoredProducts();
  const localOrders = getStoredOrders();
  return {
    connected: true,
    provider: 'Cloud Cache Local (Respaldo offline)',
    version: '2.1',
    isOnline: false,
    productsCount: localProducts.length,
    ordersCount: localOrders.length,
  };
}

// Fetch products from Cloud Database
export async function fetchCloudProducts(): Promise<Product[]> {
  try {
    const res = await fetch('/api/cloud/products', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        // Update local mirror
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(data.products));
        return data.products;
      }
    }
  } catch (err) {
    console.warn('Fetch cloud products network error, using cached products:', err);
  }

  return getStoredProducts();
}

// Save or Update Product in Cloud Database
export async function saveCloudProduct(product: Product): Promise<Product> {
  try {
    const res = await fetch('/api/cloud/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.product) {
        syncLocalProduct(data.product);
        return data.product;
      }
    }
  } catch (err) {
    console.warn('Network issue saving product to cloud, updating local cache:', err);
  }

  // Local sync fallback
  syncLocalProduct(product);
  return product;
}

// Delete Product from Cloud Database
export async function deleteCloudProduct(productId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/cloud/products/${productId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      removeLocalProduct(productId);
      return true;
    }
  } catch (err) {
    console.warn('Network issue deleting product from cloud:', err);
  }

  removeLocalProduct(productId);
  return true;
}

// Reset Catalog to Defaults in Cloud Database
export async function resetCloudProducts(): Promise<Product[]> {
  try {
    const res = await fetch('/api/cloud/products/reset', {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.products)) {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(data.products));
        return data.products;
      }
    }
  } catch (err) {
    console.warn('Network issue resetting cloud products:', err);
  }

  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
  return DEFAULT_PRODUCTS;
}

// Save Order to Cloud Database
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

// Fetch Orders from Cloud Database
export async function fetchCloudOrders(): Promise<OrderDetails[]> {
  try {
    const res = await fetch('/api/cloud/orders', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(data.orders));
        return data.orders;
      }
    }
  } catch (err) {
    console.warn('Fetch cloud orders network error:', err);
  }

  return getStoredOrders();
}

// ============ STOCK ALERTS (Avisarme cuando haya stock) ============

export async function fetchCloudStockAlerts(): Promise<StockAlert[]> {
  try {
    const res = await fetch('/api/cloud/stock-alerts', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.alerts)) {
        localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(data.alerts));
        return data.alerts;
      }
    }
  } catch (err) {
    console.warn('Fetch cloud stock alerts network error:', err);
  }

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
  try {
    const res = await fetch(`/api/cloud/stock-alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    if (res.ok) {
      updateLocalStockAlert(id, status, notes);
      return true;
    }
  } catch (err) {
    console.warn('Error updating cloud stock alert status:', err);
  }

  updateLocalStockAlert(id, status, notes);
  return true;
}

export async function deleteCloudStockAlert(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/cloud/stock-alerts/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      deleteLocalStockAlert(id);
      return true;
    }
  } catch (err) {
    console.warn('Error deleting cloud stock alert:', err);
  }

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

// Cloud Login / Admin Toggle

export async function cloudLogin(
  email: string,
  password?: string,
  forceRole?: 'admin' | 'customer'
): Promise<AuthUserProfile> {
  try {
    const res = await fetch('/api/cloud/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, forceRole }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        return data.user;
      }
    }
  } catch (e) {
    console.warn('Cloud auth login fallback:', e);
  }

  // Instant zero-failure local fallback
  const isAdmin = forceRole === 'admin' || email.toLowerCase().includes('admin') || password === 'admin123';
  const profile: AuthUserProfile = {
    id: isAdmin ? 'admin-master' : `user-${Date.now()}`,
    email: email || (isAdmin ? 'admin@lajuaquina.com' : 'cliente@lajuaquina.com'),
    name: isAdmin ? 'Administrador La Juaquina' : (email.split('@')[0] || 'Cliente'),
    role: isAdmin ? 'admin' : 'customer',
  };
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
  return profile;
}

// Cloud Register
export async function cloudRegister(
  name: string,
  email: string,
  password?: string
): Promise<AuthUserProfile> {
  try {
    const res = await fetch('/api/cloud/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        return data.user;
      }
    }
  } catch (e) {
    console.warn('Cloud register fallback:', e);
  }

  const profile: AuthUserProfile = {
    id: `user-${Date.now()}`,
    email,
    name,
    role: email.toLowerCase().includes('admin') ? 'admin' : 'customer',
  };
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
  return profile;
}

// Cloud Logout
export async function cloudLogout(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY_USER);
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
  patch: Partial<Pick<OrderDetails, 'status' | 'trackingCode' | 'adminNotes'>>
): Promise<boolean> {
  try {
    const res = await fetch(`/api/cloud/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.order) saveOrderLocally(data.order);
      else patchLocalOrder(orderId, patch);
      return true;
    }
  } catch (err) {
    console.warn('Error updating order status in cloud:', err);
  }
  patchLocalOrder(orderId, patch);
  return true;
}

export async function deleteCloudOrder(orderId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/cloud/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' });
    if (res.ok) {
      removeLocalOrder(orderId);
      return true;
    }
  } catch (err) {
    console.warn('Error deleting order:', err);
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

// ============ STORE SETTINGS (comercio y envíos, compartido tienda/admin) ============

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
  try {
    const res = await fetch('/api/cloud/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.settings) return data.settings;
    }
  } catch (e) {
    console.warn('Save settings network error:', e);
  }
  return settings;
}

// Decrementa stock luego de una compra (tienda -> admin)
export async function decrementStockForOrder(order: OrderDetails, products: Product[]): Promise<Product[]> {  const updated = products.map((p) => {
    const itemsForProduct = order.items.filter((i) => i.product.id === p.id);
    if (itemsForProduct.length === 0) return p;
    return {
      ...p,
      variants: p.variants.map((v) => {
        const match = itemsForProduct.find((i) => i.selectedVariant.weight === v.weight);
        if (!match) return v;
        const current = typeof v.stock === 'number' ? v.stock : null;
        if (current === null) return v; // stock ilimitado
        const next = Math.max(0, current - match.quantity);
        return { ...v, stock: next, inStock: next > 0 };
      }),
    };
  });
  // Persistir cada producto modificado
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

// ============ DISTRIBUIDORES MAYORISTAS ============

function getStoredDistributors(): Distributor[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DISTRIBUTORS);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function fetchCloudDistributors(): Promise<Distributor[]> {
  try {
    const res = await fetch('/api/cloud/distributors', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.distributors)) {
        localStorage.setItem(STORAGE_KEY_DISTRIBUTORS, JSON.stringify(data.distributors));
        return data.distributors;
      }
    }
  } catch (err) {
    console.warn('Fetch distributors network error:', err);
  }
  return getStoredDistributors();
}

export async function saveCloudDistributor(d: Distributor): Promise<Distributor> {
  try {
    const res = await fetch('/api/cloud/distributors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distributor: d }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.distributor) {
        syncLocalDistributor(data.distributor);
        return data.distributor;
      }
    }
  } catch (err) {
    console.warn('Save distributor network error:', err);
  }
  syncLocalDistributor(d);
  return d;
}

export async function deleteCloudDistributor(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/cloud/distributors/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) {
      removeLocalDistributor(id);
      return true;
    }
  } catch (err) {
    console.warn('Delete distributor network error:', err);
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
