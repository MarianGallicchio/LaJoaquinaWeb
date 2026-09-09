import { json } from './_lib/http';
import { readDoc } from './_lib/db';
import { mpConfigured } from './_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return json({ error: 'Método no permitido.' }, 405);
  const products = await readDoc<any[]>('products', []);
  const orders = await readDoc<any[]>('orders', []);
  return json({
    status: 'ok',
    store: 'La Joaquina Pet Shop',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    paymentsConfigured: mpConfigured(),
    productsCount: products.length,
    ordersCount: orders.length,
  });
}
