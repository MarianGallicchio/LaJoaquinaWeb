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
      const body = await bodyOf(req);
      const order = body?.order || body;
      if (!order) {
        console.error('[API /api/cloud/orders] Error: Payload de orden vacío o inválido:', body);
        return err('Payload de orden vacío.', 400);
      }
      console.log('[API /api/cloud/orders] Recibido pedido:', order.orderId || 'sin-id', 'Cliente:', order.customerName);
      const saved = await createOrder(order);
      console.log('[API /api/cloud/orders] Pedido guardado exitosamente:', saved.orderId);
      return json({ success: true, order: saved });
    } catch (e: any) {
      console.error('[API /api/cloud/orders] Excepción al guardar pedido:', e);
      return err(e.message || 'Error guardando orden.', 500);
    }
  }
  return err('Método no permitido.', 405);
}
