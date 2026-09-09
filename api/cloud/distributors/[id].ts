import { json, err, requireAdmin } from '../../_lib/http';
import { deleteDistributor } from '../../_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'DELETE') return err('Método no permitido.', 405);
  if (!requireAdmin(req)) return err('No autorizado.', 401);
  const id = decodeURIComponent(new URL(req.url).pathname.split('/').pop() as string);
  await deleteDistributor(id);
  return json({ success: true });
}
