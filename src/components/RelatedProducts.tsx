import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { formatARS } from '../lib/storeSettings';

interface Props {
  product: Product;
  products: Product[];
  onAddToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
  onOpenDetails: (product: Product) => void;
}

export function pickRelated(product: Product, products: Product[], count = 4): Product[] {
  const others = products.filter((p) => p.id !== product.id);
  const sameCat = others.filter((p) => p.category === product.category);
  const sameBrand = others.filter((p) => p.category !== product.category && p.brand === product.brand);
  const rest = others.filter((p) => p.category !== product.category && p.brand !== product.brand);
  const byRating = (a: Product, b: Product) => (b.rating || 0) - (a.rating || 0);
  return [...sameCat.sort(byRating), ...sameBrand.sort(byRating), ...rest.sort(byRating)].slice(0, count);
}

function minPrice(p: Product): number {
  if (!p.variants || p.variants.length === 0) return 0;
  return Math.min(...p.variants.map((v) => Number(v.price) || 0));
}

export const RelatedProducts: React.FC<Props> = ({ product, products, onAddToCart, onOpenDetails }) => {
  const related = useMemo(() => pickRelated(product, products), [product, products]);
  if (related.length === 0) return null;
  return (
    <div className="mt-5 pt-4 border-t border-[#EFE8D8]">
      <h3 className="text-sm font-extrabold text-[#1B4E43] font-display">
        Llevalo con 🐾
      </h3>
      <p className="text-[11px] text-[#8A7969]">Combinan perfecto con este producto</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {related.map((p) => {
          const v = (p.variants && p.variants[0]) || { weight: 'Estándar', price: 0, inStock: true };
          const out = v.inStock === false;
          return (
            <div key={p.id} className="bg-[#FAF5EC] border border-[#E8DFC9] rounded-xl p-2 flex flex-col">
              <button onClick={() => onOpenDetails(p)} className="cursor-pointer text-left">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className="w-full h-20 object-contain rounded-lg bg-white"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <p className="text-[11px] font-bold text-[#2B231D] mt-1.5 leading-tight line-clamp-2">{p.name}</p>
                <p className="text-xs font-black text-[#1B4E43] mt-0.5">{formatARS(minPrice(p))}</p>
              </button>
              <button
                onClick={() => !out && onAddToCart(p, v as ProductVariant, 1)}
                disabled={out}
                className="mt-1.5 flex items-center justify-center gap-1 bg-[#EFA332] hover:bg-[#E39420] disabled:opacity-50 text-[#1E170E] text-[11px] font-bold py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {out ? 'Sin stock' : 'Agregar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
