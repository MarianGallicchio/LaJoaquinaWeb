import { bodyOf, json, err, requireAdmin } from '../_lib/http';
import { listProducts, upsertProduct, replaceProducts } from '../_lib/core';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    const products = await listProducts();
    return json({ success: true, products, count: products.length });
  }
  if (req.method === 'POST') {
    if (!requireAdmin(req)) return err('No autorizado.', 401);
    try {
      const { product, products } = await bodyOf(req);
      if (Array.isArray(products)) {
        const count = await replaceProducts(products);
        return json({ success: true, count });
      }
      const saved = await upsertProduct(product);
      return json({ success: true, product: saved });
    } catch (e: any) {
      return err(e.message || 'Error guardando producto.');
    }
  }
  return err('Método no permitido.', 405);
}
