import { bodyOf, json, err, requireAdmin } from '../_lib/http';
import { getSettings, saveSettings } from '../_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    return json({ success: true, settings: await getSettings() });
  }
  if (req.method === 'POST') {
    if (!requireAdmin(req)) return err('No autorizado.', 401);
    try {
      const { settings } = await bodyOf(req);
      return json({ success: true, settings: await saveSettings(settings) });
    } catch (e: any) {
      return err(e.message || 'Error guardando configuración.');
    }
  }
  return err('Método no permitido.', 405);
}
