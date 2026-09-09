import { json, err } from '../../_lib/http';
import { verifyAdminToken } from '../../_lib/auth';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return err('Método no permitido.', 405);
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  const profile = m ? verifyAdminToken(m[1].trim()) : null;
  if (!profile) return err('Sesión inválida.', 401);
  return json({ success: true, user: profile });
}
