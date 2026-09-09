import { json, err, requireAdmin } from '../../_lib/http';
import { replaceProducts } from '../../_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return err('Método no permitido.', 405);
  if (!requireAdmin(req)) return err('No autorizado.', 401);
  await replaceProducts([]);
  return json({ success: true, message: 'Catálogo reseteado.', products: [] });
}
