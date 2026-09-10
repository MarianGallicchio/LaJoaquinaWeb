// Backend real Supabase (Postgres + Auth + Realtime).
// Se activa solo si el build tiene VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
// La anon key es pública por diseño: los datos los protegen las políticas RLS
// (ver supabase/schema.sql) y el login de dueña es por Supabase Auth.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, OrderDetails, StockAlert, StoreSettings, Distributor } from '../types';
import type { AuthUserProfile } from './cloudDb';

const URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const ANON = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

export function supaIsConfigured(): boolean {
  return Boolean(URL && ANON);
}

export function supa(): SupabaseClient {
  if (!client) client = createClient(URL, ANON);
  return client;
}

function errMsg(e: any, fallback: string): Error {
  const m = e?.message || '';
  if (/row-level|permission|policy|JWT|auth/i.test(m)) {
    return new Error('Sesión de administradora vencida. Volvé a ingresar.');
  }
  return new Error(m || fallback);
}

// ============ PRODUCTOS ============
export async function supaGetProducts(): Promise<Product[]> {
  const { data, error } = await supa().from('products').select('data');
  if (error) throw errMsg(error, 'No se pudieron leer los productos.');
  return (data || []).map((r: any) => r.data);
}

export async function supaSaveProduct(p: Product): Promise<Product> {
  const { error } = await supa().from('products').upsert(
    { id: p.id, data: p, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
  if (error) throw errMsg(error, 'No se pudo guardar el producto.');
  return p;
}

export async function supaDeleteProduct(id: string): Promise<void> {
  const { error } = await supa().from('products').delete().eq('id', id);
  if (error) throw errMsg(error, 'No se pudo eliminar el producto.');
}

export async function supaReplaceProducts(list: Product[]): Promise<void> {
  const ids = list.map((p) => p.id);
  const { data: existing } = await supa().from('products').select('id');
  const stale = ((existing || []) as any[]).map((r) => r.id).filter((id: string) => !ids.includes(id));
  if (stale.length > 0) {
    const { error } = await supa().from('products').delete().in('id', stale);
    if (error) throw errMsg(error, 'No se pudo reemplazar el catálogo.');
  }
  for (const p of list) await supaSaveProduct(p);
}

// ============ PEDIDOS ============
export async function supaGetOrders(): Promise<OrderDetails[]> {
  const { data, error } = await supa().from('orders').select('data').order('created_at', { ascending: false }).limit(500);
  if (error) throw errMsg(error, 'No se pudieron leer los pedidos.');
  return (data || []).map((r: any) => r.data);
}

export async function supaSaveOrder(o: OrderDetails): Promise<OrderDetails> {
  const { error } = await supa().from('orders').upsert(
    { order_id: o.orderId, data: o },
    { onConflict: 'order_id' }
  );
  if (error) throw errMsg(error, 'No se pudo guardar el pedido.');
  return o;
}

export async function supaPatchOrder(id: string, patch: Record<string, any>): Promise<OrderDetails> {
  const { data: rows, error: readErr } = await supa().from('orders').select('data').eq('order_id', id).limit(1);
  if (readErr) throw errMsg(readErr, 'No se pudo leer el pedido.');
  const current = rows && rows[0] ? (rows[0] as any).data : null;
  if (!current) throw new Error('Pedido no encontrado.');
  const allowed = ['status', 'trackingCode', 'adminNotes', 'history'];
  for (const k of allowed) if (patch[k] !== undefined) current[k] = patch[k];
  const { error } = await supa().from('orders').update({ data: current }).eq('order_id', id);
  if (error) throw errMsg(error, 'No se pudo actualizar el pedido.');
  return current;
}

export async function supaDeleteOrder(id: string): Promise<void> {
  const { error } = await supa().from('orders').delete().eq('order_id', id);
  if (error) throw errMsg(error, 'No se pudo eliminar el pedido.');
}

// Avisos en vivo: nuevos pedidos llegan solos al admin (sin recargar)
export function supaSubscribeOrders(onInsert: (o: OrderDetails) => void): () => void {
  try {
    const ch = supa()
      .channel('orders-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload: any) => {
        const order = payload?.new?.data;
        if (order && order.orderId) onInsert(order as OrderDetails);
      })
      .subscribe();
    return () => {
      try {
        supa().removeChannel(ch);
      } catch { /* ignore */ }
    };
  } catch {
    return () => {};
  }
}

// ============ ALERTAS ============
export async function supaGetAlerts(): Promise<StockAlert[]> {
  const { data, error } = await supa().from('stock_alerts').select('data').order('created_at', { ascending: false }).limit(500);
  if (error) throw errMsg(error, 'No se pudieron leer las alertas.');
  return (data || []).map((r: any) => r.data);
}

export async function supaCreateAlert(a: StockAlert): Promise<StockAlert> {
  const { error } = await supa().from('stock_alerts').insert({ id: a.id, data: a });
  if (error) throw errMsg(error, 'No se pudo registrar la alerta.');
  return a;
}

export async function supaPatchAlert(id: string, patch: Record<string, any>): Promise<StockAlert> {
  const { data: rows } = await supa().from('stock_alerts').select('data').eq('id', id).limit(1);
  const current = rows && rows[0] ? (rows[0] as any).data : null;
  if (!current) throw new Error('Alerta no encontrada.');
  if (patch.status) current.status = patch.status;
  if (patch.notes !== undefined) current.notes = patch.notes;
  const { error } = await supa().from('stock_alerts').update({ data: current }).eq('id', id);
  if (error) throw errMsg(error, 'No se pudo actualizar la alerta.');
  return current;
}

export async function supaDeleteAlert(id: string): Promise<void> {
  const { error } = await supa().from('stock_alerts').delete().eq('id', id);
  if (error) throw errMsg(error, 'No se pudo eliminar la alerta.');
}

// ============ DISTRIBUIDORES ============
export async function supaGetDistributors(): Promise<Distributor[]> {
  const { data, error } = await supa().from('distributors').select('data');
  if (error) throw errMsg(error, 'No se pudieron leer los distribuidores.');
  return (data || []).map((r: any) => r.data);
}

export async function supaSaveDistributor(d: Distributor): Promise<Distributor> {
  const { error } = await supa().from('distributors').upsert({ id: d.id, data: d }, { onConflict: 'id' });
  if (error) throw errMsg(error, 'No se pudo guardar el distribuidor.');
  return d;
}

export async function supaDeleteDistributor(id: string): Promise<void> {
  const { error } = await supa().from('distributors').delete().eq('id', id);
  if (error) throw errMsg(error, 'No se pudo eliminar el distribuidor.');
}

// ============ CONFIGURACIÓN ============
export async function supaGetSettings(): Promise<StoreSettings | null> {
  const { data, error } = await supa().from('store_settings').select('data').eq('id', 'main').limit(1);
  if (error) throw errMsg(error, 'No se pudo leer la configuración.');
  return data && data[0] ? ((data[0] as any).data as StoreSettings) : null;
}

export async function supaSaveSettings(s: StoreSettings): Promise<StoreSettings> {
  const full = { ...s, updatedAt: new Date().toISOString() };
  const { error } = await supa().from('store_settings').upsert({ id: 'main', data: full, updated_at: full.updatedAt }, { onConflict: 'id' });
  if (error) throw errMsg(error, 'No se pudo guardar la configuración.');
  return full;
}

// ============ AUTH DUEÑA (Supabase Auth, sin claves en código) ============
function toProfile(id: string, email: string): AuthUserProfile {
  return { id, email, name: 'Administradora La Joaquina', role: 'admin' };
}

export async function supaLogin(email: string, password: string): Promise<AuthUserProfile> {
  const { data, error } = await supa().auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) throw new Error('Credenciales inválidas.');
  return toProfile(data.user.id, data.user.email || email.trim());
}

export async function supaMe(): Promise<AuthUserProfile | null> {
  try {
    const { data } = await supa().auth.getSession();
    const u = data.session?.user;
    if (!u) return null;
    return toProfile(u.id, u.email || '');
  } catch {
    return null;
  }
}

export async function supaLogout(): Promise<void> {
  try {
    await supa().auth.signOut();
  } catch { /* ignore */ }
}
