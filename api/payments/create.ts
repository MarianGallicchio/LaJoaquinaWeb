import { bodyOf, json, err, baseUrlOf } from '../_lib/http';
import { createOrder, createMpPreference, mpConfigured } from '../_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return err('Método no permitido.', 405);
  if (!mpConfigured()) {
    return err('El cobro online no está configurado. Elegí transferencia o coordiná por WhatsApp.', 503);
  }
  try {
    const { order } = await bodyOf(req);
    // El pedido queda en estado pago_pendiente hasta que Mercado Pago confirme
    const saved = await createOrder({ ...order, status: 'pago_pendiente' });
    const pref = await createMpPreference(saved, baseUrlOf(req));
    return json({ success: true, order: saved, initPoint: pref.initPoint, preferenceId: pref.preferenceId });
  } catch (e: any) {
    return err(e.message || 'Error generando el link de pago.');
  }
}
