import { json, err } from '../_lib/http';
import { readDoc } from '../_lib/db';
import { mpConfigured } from '../_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return err('Método no permitido.', 405);
  const products = await readDoc<any[]>('products', []);
  const orders = await readDoc<any[]>('orders', []);
  return json({
    connected: true,
    provider: 'La Juaquina Cloud DB',
    version: '3.0',
    productsCount: products.length,
    ordersCount: orders.length,
  });
}
