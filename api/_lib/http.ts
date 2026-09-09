// Helpers HTTP para las funciones serverless (Web Request/Response estándar).
import { adminFromAuthHeader, AdminProfile } from './auth';

export const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const err = (message: string, status = 400) => json({ error: message }, status);

export async function bodyOf(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function requireAdmin(req: Request): AdminProfile | null {
  return adminFromAuthHeader(req.headers.get('authorization'));
}

export function baseUrlOf(req: Request): string {
  const override = process.env.BACKEND_URL || process.env.APP_URL || '';
  if (override) return override.replace(/\/$/, '');
  try {
    const u = new URL(req.url);
    const proto = req.headers.get('x-forwarded-proto') || u.protocol.replace(':', '');
    const host = req.headers.get('x-forwarded-host') || u.host;
    return `${proto}://${host}`;
  } catch {
    return '';
  }
}
