import { bodyOf, json, err, requireAdmin } from '../_lib/http';
import { listOrders, createOrder } from '../_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    // Solo el admin puede listar pedidos (datos de clientes)
    if (!requireAdmin(req)) return err('No autorizado.', 401);
    const orders = await listOrders();
    return json({ success: true, orders });
  }
  if (req.method === 'POST') {
    try {
      const { order } = await bodyOf(req);
      const saved = await createOrder(order);
      return json({ success: true, order: saved });
    } catch (e: any) {
      return err(e.message || 'Error guardando orden.');
    }
  }
  return err('Método no permitido.', 405);
}
