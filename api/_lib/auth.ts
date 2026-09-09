// Auth real del administrador: email + contraseña por variables de entorno,
// token HMAC sin dependencias externas. Sin backdoors ni claves hardcodeadas.
import { createHmac, timingSafeEqual } from 'crypto';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin';
}

const TOKEN_TTL_MS = 30 * 24 * 3600 * 1000; // 30 días

// Lectura perezosa: dotenv/config del host puede cargarse después de los imports
function adminEmail(): string {
  return (process.env.ADMIN_EMAIL || 'admin@lajuaquina.com').toLowerCase().trim();
}

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || '';
}

function adminSecret(): string {
  return process.env.ADMIN_SECRET || adminPassword();
}

export function adminConfigured(): boolean {
  return adminPassword().length >= 8 && adminSecret().length >= 8;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) {
    // Comparación de largo constante aproximada para no filtrar longitud
    const dummy = Buffer.alloc(Math.max(ba.length, bb.length));
    try {
      timingSafeEqual(dummy, dummy);
    } catch { /* noop */ }
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export function verifyAdminCredentials(email: string, password: string): AdminProfile | null {
  if (!adminConfigured()) return null;
  const emailOk = safeEqual((email || '').toLowerCase().trim(), adminEmail());
  const passOk = safeEqual(password || '', adminPassword());
  if (!emailOk || !passOk) return null;
  return { id: 'admin-master', email: adminEmail(), name: 'Administrador La Juaquina', role: 'admin' };
}

function b64url(obj: any): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

export function issueAdminToken(profile: AdminProfile): string {
  const payload = { ...profile, iat: Date.now(), exp: Date.now() + TOKEN_TTL_MS };
  const body = b64url(payload);
  const sig = createHmac('sha256', adminSecret()).update(body).digest('hex');
  return `${body}.${sig}`;
}

export function verifyAdminToken(token: string): AdminProfile | null {
  try {
    if (!token || !adminConfigured()) return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = createHmac('sha256', adminSecret()).update(body).digest('hex');
    if (!safeEqual(sig, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.role !== 'admin' || Date.now() > payload.exp) return null;
    return { id: payload.id, email: payload.email, name: payload.name, role: 'admin' };
  } catch {
    return null;
  }
}

export function adminFromAuthHeader(authHeader: string | null | undefined): AdminProfile | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return verifyAdminToken(m[1].trim());
}
