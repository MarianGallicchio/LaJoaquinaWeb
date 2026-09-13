import { json, err } from '../_lib/http';
import { listOrders } from '../_lib/core';

// Pedidos propios por email (lo usa el seguimiento público de la tienda).
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return err('Método no permitido.', 405);
  try {
    const url = new URL(req.url);
    const email = (url.searchParams.get('email') || '').toLowerCase().trim();
    if (!email) return err('Email requerido.', 400);
    const orders = await listOrders();
    const filtered = orders.filter((o: any) => (o.customerEmail || '').toLowerCase() === email);
    return json({ success: true, orders: filtered });
  } catch (e: any) {
    return err(e.message || 'Error leyendo pedidos.', 500);
  }
}
