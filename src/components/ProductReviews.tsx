import React, { useEffect, useState } from 'react';
import { Star, Send, BadgeCheck } from 'lucide-react';
import { Review } from '../types';
import { fetchReviews, submitReview, ratingWithReviews } from '../lib/cloudDb';
import { Product } from '../types';

interface Props {
  product: Product;
  customerName?: string;
}

function Stars({ value, size = 'w-3.5 h-3.5' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= Math.round(value) ? 'text-[#EFA332] fill-[#EFA332]' : 'text-[#D8CBAF]'}`}
        />
      ))}
    </span>
  );
}

export { Stars };

export const ProductReviews: React.FC<Props> = ({ product, customerName }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState(customerName || '');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setName(customerName || '');
  }, [customerName]);

  useEffect(() => {
    let alive = true;
    fetchReviews(product.id)
      .then((r) => alive && setReviews(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [product.id]);

  const agg = ratingWithReviews(product, reviews);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      setMsg('Contanos qué te pareció el producto.');
      return;
    }
    setSending(true);
    setMsg(null);
    try {
      await submitReview({
        productId: product.id,
        productName: product.name,
        customerName: name.trim() || 'Cliente',
        rating,
        comment: comment.trim(),
      });
      setComment('');
      setMsg('¡Gracias! Tu reseña quedó pendiente de aprobación y se publica enseguida.');
    } catch (e: any) {
      setMsg(e?.message || 'No se pudo enviar tu reseña. Probá de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-5 pt-4 border-t border-[#EFE8D8]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-[#1B4E43] font-display">
          Opiniones de clientes
        </h3>
        <span className="flex items-center gap-1.5 text-xs font-bold text-[#5A4D3F]">
          <Stars value={agg.rating} />
          {agg.rating.toFixed(1)} ({agg.count})
        </span>
      </div>

      {reviews.length === 0 ? (
        <p className="text-[11px] text-[#8A7969] mt-2">
          Todavía no hay opiniones publicadas. ¡Sé la primera persona en contar tu experiencia! 🐾
        </p>
      ) : (
        <div className="mt-2.5 space-y-2 max-h-44 overflow-y-auto pr-1">
          {reviews.slice(0, 10).map((r) => (
            <div key={r.id} className="bg-[#FAF5EC] border border-[#E8DFC9] rounded-xl p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#1B4E43] flex items-center gap-1 truncate">
                  <BadgeCheck className="w-3 h-3 text-[#256B5C] shrink-0" />
                  {r.customerName}
                </span>
                <Stars value={r.rating} size="w-3 h-3" />
              </div>
              <p className="text-[11px] text-[#5B4E41] mt-1 leading-relaxed">{r.comment}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 bg-[#F6EFE2] rounded-xl p-3">
        <p className="text-[11px] font-bold text-[#1B4E43] mb-2">¿Lo probaste? Dejanos tu opinión ⭐</p>
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} onClick={() => setRating(i)} className="cursor-pointer" aria-label={`${i} estrellas`}>
              <Star className={`w-5 h-5 ${i <= rating ? 'text-[#EFA332] fill-[#EFA332]' : 'text-[#D8CBAF]'}`} />
            </button>
          ))}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          className="w-full text-xs bg-white border border-[#E3D6BE] rounded-xl px-2.5 py-2 mb-2 outline-none focus:ring-1 focus:ring-[#1B4E43]"
        />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="¿Qué te pareció? ¿A tu mascota le gustó?"
          rows={2}
          className="w-full text-xs bg-white border border-[#E3D6BE] rounded-xl px-2.5 py-2 outline-none focus:ring-1 focus:ring-[#1B4E43] resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={sending}
          className="mt-2 w-full flex items-center justify-center gap-1.5 bg-[#1B4E43] hover:bg-[#256B5C] disabled:opacity-60 text-white text-xs font-bold py-2 rounded-xl cursor-pointer transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? 'Enviando...' : 'Publicar opinión'}
        </button>
        {msg && <p className="text-[11px] text-[#5A4D3F] mt-2">{msg}</p>}
      </div>
    </div>
  );
};
