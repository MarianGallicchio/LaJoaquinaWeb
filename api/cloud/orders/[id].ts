import { bodyOf, json, err, requireAdmin } from '../../_lib/http';
import { patchOrder, deleteOrder } from '../../_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (!requireAdmin(req)) return err('No autorizado.', 401);
  const id = decodeURIComponent(new URL(req.url).pathname.split('/').pop() as string);
  if (req.method === 'PATCH') {
    try {
      const updated = await patchOrder(id, await bodyOf(req));
      return json({ success: true, order: updated });
    } catch (e: any) {
      return err(e.message || 'Error actualizando pedido.', 404);
    }
  }
  if (req.method === 'DELETE') {
    await deleteOrder(id);
    return json({ success: true });
  }
  return err('Método no permitido.', 405);
}
