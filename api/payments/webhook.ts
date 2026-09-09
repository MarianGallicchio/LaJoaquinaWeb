import { json } from '../_lib/http';
import { handleMpWebhook } from '../_lib/core';

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const query: Record<string, any> = {};
    url.searchParams.forEach((v, k) => (query[k] = v));
    let body: Record<string, any> = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch { /* puede venir vacío */ }
    }
    const result = await handleMpWebhook(query, body);
    return json({ success: true, ...result });
  } catch (e: any) {
    return json({ success: false, error: e.message || 'Webhook error' });
  }
}
