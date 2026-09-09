import { bodyOf, json, err, requireAdmin } from '../_lib/http';
import { listDistributors, upsertDistributor } from '../_lib/core';
import { writeDoc } from '../_lib/db';

export default async function handler(req: Request): Promise<Response> {
  if (!requireAdmin(req)) return err('No autorizado.', 401);
  if (req.method === 'GET') {
    return json({ success: true, distributors: await listDistributors() });
  }
  if (req.method === 'POST') {
    try {
      const { distributor, distributors } = await bodyOf(req);
      if (Array.isArray(distributors)) {
        await writeDoc('distributors', distributors);
        return json({ success: true, count: distributors.length });
      }
      const saved = await upsertDistributor(distributor);
      return json({ success: true, distributor: saved });
    } catch (e: any) {
      return err(e.message || 'Error guardando distribuidor.');
    }
  }
  return err('Método no permitido.', 405);
}
