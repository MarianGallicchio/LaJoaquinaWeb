import { json } from './_lib/http';
import { createOrder } from './_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  try {
    const body = await req.json();
    const order = body?.order || body;
    if (!order) {
      console.error('[API /api/order] Payload vacío:', body);
      return json({ error: 'Payload de orden vacío.' }, 400);
    }
    console.log('[API /api/order] Guardando pedido directo:', order.orderId || 'sin-id');
    const saved = await createOrder(order);
    console.log('[API /api/order] Pedido guardado:', saved.orderId);
    return json({ success: true, order: saved, message: `¡Tu pedido ${saved.orderId} fue registrado con éxito!` });
  } catch (err: any) {
    console.error('[API /api/order] Error procesando la orden:', err);
    return json({ error: err.message || 'Error procesando la orden.' }, 500);
  }
}
