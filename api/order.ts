import { json } from './_lib/http';
import { createOrder } from './_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  try {
    const body = await req.json();
    const saved = await createOrder(body.orderId ? body : body);
    return json({ success: true, order: saved, message: `¡Tu pedido ${saved.orderId} fue registrado con éxito!` });
  } catch {
    return json({ error: 'Error procesando la orden.' }, 500);
  }
}
