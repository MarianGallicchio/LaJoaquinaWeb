import { bodyOf, json, err, requireAdmin } from '../_lib/http';
import { listStockAlerts, createStockAlert } from '../_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    if (!requireAdmin(req)) return err('No autorizado.', 401);
    return json({ success: true, alerts: await listStockAlerts() });
  }
  if (req.method === 'POST') {
    try {
      const { alert } = await bodyOf(req);
      const saved = await createStockAlert(alert);
      return json({ success: true, alert: saved, message: '¡Alerta registrada con éxito!' });
    } catch (e: any) {
      return err(e.message || 'Error guardando alerta.');
    }
  }
  return err('Método no permitido.', 405);
}
