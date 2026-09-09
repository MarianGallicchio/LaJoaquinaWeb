import { bodyOf, json, err, requireAdmin } from '../../_lib/http';
import { patchStockAlert, deleteStockAlert } from '../../_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (!requireAdmin(req)) return err('No autorizado.', 401);
  const id = decodeURIComponent(new URL(req.url).pathname.split('/').pop() as string);
  if (req.method === 'PATCH') {
    try {
      const updated = await patchStockAlert(id, await bodyOf(req));
      return json({ success: true, alert: updated });
    } catch (e: any) {
      return err(e.message || 'Error actualizando alerta.', 404);
    }
  }
  if (req.method === 'DELETE') {
    await deleteStockAlert(id);
    return json({ success: true, message: 'Alerta eliminada' });
  }
  return err('Método no permitido.', 405);
}
