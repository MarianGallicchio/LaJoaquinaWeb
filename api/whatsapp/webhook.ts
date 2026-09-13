import type { VercelRequest, VercelResponse } from '@vercel/node';

// Webhook WhatsApp Cloud API - Verificación + recepción
// GET = verificación de Meta (hub.challenge)
// POST = eventos entrantes (mensajes/estados) - solo responde 200 para no reintentar
export default function handler(req: VercelRequest, res: VercelResponse) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'lajoaquina_verify_2026';

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge as string);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    // Log para debug, siempre 200 para que Meta no reintente
    try {
      console.log('[whatsapp webhook]', JSON.stringify(req.body).slice(0, 2000));
    } catch {}
    return res.status(200).json({ status: 'ok' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
