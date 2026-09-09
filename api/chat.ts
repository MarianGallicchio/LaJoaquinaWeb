import { bodyOf, json, err } from './_lib/http';
import { chatReply } from './_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return err('Método no permitido.', 405);
  try {
    const { message, history } = await bodyOf(req);
    const result = await chatReply(message, history);
    return json(result);
  } catch (e: any) {
    return json({
      reply: 'Tuvimos una intermitencia en el chat. Escribinos por WhatsApp y te ayudamos enseguida.',
      error: e.message || 'Chat error',
    });
  }
}
