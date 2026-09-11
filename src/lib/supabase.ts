// Backend real Supabase (Postgres + Auth + Realtime).
// Se activa solo si el build tiene VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
// La anon key es pública por diseño: los datos los protegen las políticas RLS
// (ver supabase/schema.sql) y el login de dueña es por Supabase Auth.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, OrderDetails, StockAlert, StoreSettings, Distributor, CustomerProfileData } from '../types';
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
  // Solo INSERT para anónimos: el upsert exige permiso de UPDATE que los
  // clientes no tienen (ni deben tener). Si el ID existiera, se regenera.
  let order = o;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supa().from('orders').insert({ order_id: order.orderId, data: order });
    if (!error) return order;
    if (error.code === '23505' && attempt === 0) {
      order = { ...order, orderId: `JQ-${Date.now().toString().slice(-6)}` };
      continue;
    }
    throw errMsg(error, 'No se pudo guardar el pedido.');
  }
  return order;
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

// ============ AUTH (dueña por email fijo + empleados por tabla staff) ============
// La dueña es siempre marianoagusting1996@gmail.com (ver schema.sql).
// Los empleados se crean su cuenta en la tienda y la dueña les da el puesto
// en Equipo. Nadie puede auto-otorgarse nada: los permisos viven en SQL.

export const OWNER_EMAIL = 'marianoagusting1996@gmail.com';

export type StaffRole = 'admin' | 'stock' | 'ventas';

export interface StaffRow {
  email: string;
  name: string;
  role: StaffRole;
  active: boolean;
  createdAt?: string;
}

function toProfile(
  id: string,
  email: string,
  role: 'admin' | 'customer' | 'stock' | 'ventas',
  isOwner: boolean,
  name?: string
): AuthUserProfile {
  const fallback = isOwner ? 'Administradora La Joaquina' : email.split('@')[0];
  return { id, email, name: name || fallback, role, isOwner };
}

// Traduce errores de Auth a mensajes claros en español
function mapAuthError(raw: string, fallback: string): string {
  const m = (raw || '').toLowerCase();
  if (!raw || m.includes('failed to fetch') || m.includes('network') || m.includes('timeout')) {
    return 'Sin conexión con la nube. Revisá tu internet o probá de nuevo.';
  }
  if (m.includes('signups not allowed') || (m.includes('signup') && m.includes('disabled'))) {
    return 'El registro está desactivado en este momento. Avisale a la dueña.';
  }
  if (m.includes('already') && (m.includes('registered') || m.includes('exists') || m.includes('use'))) {
    return 'Ese email ya tiene cuenta. Iniciá sesión.';
  }
  if (m.includes('email not confirmed') || (m.includes('confirm') && m.includes('email'))) {
    return 'Tenés que confirmar tu email primero. Revisá tu correo (y spam).';
  }
  if (m.includes('invalid') && m.includes('email')) {
    return 'Ese email no parece válido. Revisalo.';
  }
  if (m.includes('password') && (m.includes('short') || m.includes('6 characters') || m.includes('weak'))) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  return fallback;
}

async function resolveRole(email: string, userId: string): Promise<AuthUserProfile> {
  const clean = email.toLowerCase().trim();
  if (clean === OWNER_EMAIL) {
    return toProfile(userId, clean, 'admin', true);
  }
  const { data } = await supa().from('staff').select('*').eq('email', clean).limit(1);
  const row = (data && data[0]) as StaffRow | undefined;
  if (row) {
    if (!row.active) throw new Error('Cuenta de empleado desactivada. Hablá con la dueña.');
    if (['admin', 'stock', 'ventas'].includes(row.role)) {
      return toProfile(userId, clean, row.role as any, false, row.name || undefined);
    }
  }
  return toProfile(userId, clean, 'customer', false);
}

export async function supaLogin(email: string, password: string): Promise<AuthUserProfile> {
  const op = supa().auth.signInWithPassword({ email: email.trim(), password });
  const res = (await Promise.race([
    op,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000)),
  ]).catch((e: any) => {
    throw new Error(
      String(e?.message || '').includes('timeout')
        ? 'Tiempo agotado conectando. Revisá tu internet o probá de nuevo.'
        : 'Credenciales inválidas.'
    );
  })) as any;
  const { data, error } = res;
  if (error || !data.user) throw new Error(mapAuthError(error?.message || '', 'Credenciales inválidas.'));
  return resolveRole(data.user.email || email.trim(), data.user.id);
}

// Diagnóstico para mostrar en el login: ¿se llega a la nube? ¿están las tablas?
export async function supaDiagnostics(): Promise<{ reachable: boolean; tables: boolean; detail: string }> {
  if (!supaIsConfigured()) {
    return { reachable: false, tables: false, detail: 'Nube no configurada en esta copia' };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(`${URL}/auth/v1/health`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return { reachable: false, tables: false, detail: `La nube responde con error ${r.status}` };
  } catch {
    return { reachable: false, tables: false, detail: 'Sin conexión a la nube (internet o bloqueador de anuncios)' };
  }
  try {
    const { error } = await supa().from('products').select('id').limit(1);
    if (error) {
      if (/relation|schema cache|does not exist/i.test(error.message)) {
        return { reachable: true, tables: false, detail: 'Faltan las tablas: hay que correr el schema.sql' };
      }
      return { reachable: true, tables: false, detail: error.message.slice(0, 90) };
    }
    return { reachable: true, tables: true, detail: 'Nube conectada y lista' };
  } catch {
    return { reachable: true, tables: false, detail: 'No se pudo leer la nube' };
  }
}

export async function supaRegisterCustomer(name: string, email: string, password: string): Promise<AuthUserProfile> {
  const { data, error } = await supa().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim(), role: 'customer' } },
  });
  if (error) throw new Error(mapAuthError(error.message, 'No se pudo crear la cuenta.'));
  const user = data.user;
  // Si el proyecto exige confirmar email, igual devolvemos el perfil para comprar
  if (!user) throw new Error('Revisá tu email para confirmar la cuenta y después iniciá sesión.');
  return toProfile(user.id, user.email || email.trim(), 'customer', false, name.trim());
}

export async function supaMe(): Promise<AuthUserProfile | null> {
  try {
    const { data } = await supa().auth.getSession();
    const u = data.session?.user;
    if (!u) return null;
    return await resolveRole(u.email || '', u.id).catch(() => null);
  } catch {
    return null;
  }
}

export async function supaLogout(): Promise<void> {
  try {
    await supa().auth.signOut();
  } catch { /* ignore */ }
}

// Envía email para recuperar la contraseña (el link vuelve a la tienda
// y la sesión se activa sola al abrirlo)
export async function supaRequestReset(email: string): Promise<void> {
  const clean = email.trim();
  if (!clean || !clean.includes('@')) throw new Error('Ingresá tu email primero.');
  const { error } = await supa().auth.resetPasswordForEmail(clean, {
    redirectTo: typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined,
  });
  if (error) throw new Error('No se pudo enviar el email. Revisá que el email sea el de tu cuenta.');
}

// Cambiar la propia contraseña (dueña y empleados, con sesión iniciada)
export async function supaChangePassword(newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 6) throw new Error('La clave debe tener al menos 6 caracteres.');
  const { error } = await supa().auth.updateUser({ password: newPassword });
  if (error) throw new Error('No se pudo cambiar la clave. Volvé a ingresar e intentá de nuevo.');
}

// ============ EQUIPO (solo dueña; RLS lo exige) ============
export async function supaGetStaff(): Promise<StaffRow[]> {
  const q: any = supa().from('staff').select('*').order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) throw errMsg(error, 'No se pudo leer el equipo.');
  return ((data || []) as any[]) as StaffRow[];
}

export async function supaSaveStaff(row: StaffRow): Promise<StaffRow> {
  const clean: StaffRow = { ...row, email: row.email.toLowerCase().trim() };
  if (clean.email === OWNER_EMAIL) throw new Error('Ese email es de la dueña y no necesita fila de empleado.');
  const { error } = await supa().from('staff').upsert(clean, { onConflict: 'email' });
  if (error) throw errMsg(error, 'No se pudo guardar el empleado.');
  return clean;
}

export async function supaDeleteStaff(email: string): Promise<void> {
  const { error } = await supa().from('staff').delete().eq('email', email.toLowerCase().trim());
  if (error) throw errMsg(error, 'No se pudo eliminar el empleado.');
}

// ============ PERFIL DE CLIENTE (fila propia) ============
async function supaUid(): Promise<string> {
  const { data } = await supa().auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('Sin sesión. Volvé a ingresar.');
  return id;
}

export async function supaGetProfile(): Promise<CustomerProfileData | null> {
  const uid = await supaUid();
  const { data, error } = await supa().from('profiles').select('data').eq('user_id', uid).limit(1);
  if (error) throw errMsg(error, 'No se pudo leer tu perfil.');
  return data && data[0] ? ((data[0] as any).data as CustomerProfileData) : null;
}

export async function supaSaveProfile(profile: CustomerProfileData): Promise<CustomerProfileData> {
  const uid = await supaUid();
  const full = { ...profile, updatedAt: new Date().toISOString() };
  const { error } = await supa().from('profiles').upsert({ user_id: uid, data: full }, { onConflict: 'user_id' });
  if (error) throw errMsg(error, 'No se pudo guardar tu perfil.');
  return full;
}

// Historial del cliente: solo sus pedidos (RLS lo garantiza)
export async function supaMyOrders(email: string): Promise<OrderDetails[]> {
  const clean = email.toLowerCase().trim();
  if (!clean) return [];
  const query: any = supa().from('orders').select('data');
  const { data, error } = await query
    .eq('data->>customerEmail', clean)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw errMsg(error, 'No se pudo leer tu historial.');
  return (data || []).map((r: any) => r.data);
}
