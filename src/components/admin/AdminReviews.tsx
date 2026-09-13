import React, { useEffect, useState } from 'react';
import { Star, Check, Trash2, RefreshCw } from 'lucide-react';
import { Product, Review } from '../../types';
import { fetchAllReviewsAdmin, moderateReview, removeReview, ratingWithReviews } from '../../lib/cloudDb';
import { saveCloudProduct } from '../../lib/cloudDb';

interface Props {
  products: Product[];
  onProductsChange: (products: Product[]) => void;
  notify: (msg: string) => void;
}

// Moderación de reseñas: aprobar (actualiza promedio del producto) o eliminar
export const AdminReviews: React.FC<Props> = ({ products, onProductsChange, notify }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<'pendientes' | 'todas'>('pendientes');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setReviews(await fetchAllReviewsAdmin());
    } catch {
      notify('No se pudieron leer las reseñas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = reviews.filter((r) => !r.approved);
  const shown = filter === 'pendientes' ? pending : reviews;

  const handleApprove = async (r: Review) => {
    try {
      await moderateReview(r.id, true);
      setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, approved: true } : x)));
      // Recalcular promedio del producto con todas sus aprobadas
      const approved = [...reviews.filter((x) => x.productId === r.productId && x.approved), { ...r, approved: true }];
      const prod = products.find((p) => p.id === r.productId);
      if (prod) {
        const agg = ratingWithReviews({ ...prod, reviewsCount: prod.reviewsCount }, approved);
        const updatedProd = { ...prod, rating: agg.rating, reviewsCount: agg.count };
        try {
          await saveCloudProduct(updatedProd);
        } catch { /* queda local igual */ }
        onProductsChange(products.map((p) => (p.id === prod.id ? updatedProd : p)));
      }
      notify(`✅ Reseña de ${r.customerName} publicada.`);
    } catch {
      notify('No se pudo aprobar la reseña.');
    }
  };

  const handleDelete = async (r: Review) => {
    if (!window.confirm(`¿Eliminar la reseña de ${r.customerName}?`)) return;
    try {
      await removeReview(r.id);
      setReviews((prev) => prev.filter((x) => x.id !== r.id));
      notify('Reseña eliminada.');
    } catch {
      notify('No se pudo eliminar la reseña.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-extrabold text-[#1B4E43] font-display">⭐ Reseñas de clientes</h2>
        <span className="text-xs font-bold bg-[#FEF3C7] text-[#92400E] px-2.5 py-1 rounded-full">
          {pending.length} pendientes
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setFilter('pendientes')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer ${filter === 'pendientes' ? 'bg-[#1B4E43] text-white' : 'bg-white text-[#5A4D3F] border border-[#E3D6BE]'}`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter('todas')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer ${filter === 'todas' ? 'bg-[#1B4E43] text-white' : 'bg-white text-[#5A4D3F] border border-[#E3D6BE]'}`}
          >
            Todas
          </button>
          <button onClick={load} className="p-2 bg-white border border-[#E3D6BE] rounded-full cursor-pointer" title="Recargar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5D7BF] p-8 text-center">
          <div className="text-3xl mb-2">🌟</div>
          <p className="text-sm font-bold text-[#1B4E43]">
            {filter === 'pendientes' ? 'No hay reseñas pendientes. ¡Todo al día!' : 'Todavía no hay reseñas.'}
          </p>
          <p className="text-xs text-[#7A6A59] mt-1">Las opiniones que dejen los clientes desde cada producto aparecen acá para aprobar.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {shown.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-[#E5D7BF] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#2B231D]">
                    {r.customerName}{' '}
                    <span className="font-semibold text-[#8A7969]">· {r.productName}</span>
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? 'text-[#EFA332] fill-[#EFA332]' : 'text-[#D8CBAF]'}`} />
                    ))}
                    <span className="text-[11px] text-[#8A7969] ml-1">
                      {new Date(r.createdAt).toLocaleDateString('es-AR')}
                    </span>
                    {!r.approved && (
                      <span className="text-[10px] font-black bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full uppercase">
                        Pendiente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5B4E41] mt-1.5 leading-relaxed">{r.comment}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {!r.approved && (
                    <button
                      onClick={() => handleApprove(r)}
                      className="flex items-center gap-1 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Publicar
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(r)}
                    className="p-2 bg-[#FEF2F2] text-[#B91C1C] rounded-xl hover:bg-[#FEE2E2] cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
