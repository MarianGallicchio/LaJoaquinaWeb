import { bodyOf, json, err } from '../../_lib/http';
import { registerCustomer } from '../../_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return err('Método no permitido.', 405);
  const { name, email } = await bodyOf(req);
  if (!email) return err('Email requerido.', 400);
  // El registro público NUNCA crea administradores
  const user = await registerCustomer(name, email);
  return json({ success: true, user });
}
