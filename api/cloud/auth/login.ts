import { bodyOf, json, err } from '../../_lib/http';
import { loginAdmin } from '../../_lib/core';
import { adminConfigured } from '../../_lib/auth';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return err('Método no permitido.', 405);
  if (!adminConfigured()) {
    return err('Acceso de administrador no configurado. Definí ADMIN_PASSWORD en el servidor.', 503);
  }
  const { email, password } = await bodyOf(req);
  // Sin atajos: solo email + contraseña exacta. Se ignora cualquier forceRole.
  const result = await loginAdmin(email, password);
  if (!result) return err('Credenciales inválidas.', 401);
  return json({ success: true, user: result.user, token: result.token });
}
