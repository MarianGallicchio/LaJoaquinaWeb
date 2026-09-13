import React, { useEffect, useState } from 'react';
import { RefreshCw, MessageCircle, Check, X } from 'lucide-react';
import { CartRecovery } from '../../types';
import { fetchRecoveries, dismissRecovery, markRecoveryDone } from '../../lib/cloudDb';
import { waLink, formatARS } from '../../lib/storeSettings';

interface Props {
  notify: (msg: string) => void;
  storeName: string;
}

// Carritos abandonados: contactar por WhatsApp para recuperar la venta
export const AdminRecovery: React.FC<Props> = ({ notify, storeName }) => {
  const [items, setItems] = useState<CartRecovery[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await fetchRecoveries());
    } catch {
      notify('No se pudieron leer los recuperos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = items.filter((r) => r.status === 'pending');
  const shown = showAll ? items : pending;

  const waText = (r: CartRecovery) =>
    `¡Hola ${r.customerName}! Te escribimos de ${storeName} 🐾. Vimos que dejaste en el carrito: ${r.itemsSummary} (${formatARS(r.total)}). ¿Te ayudamos a completar tu compra?`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-extrabold text-[#1B4E43] font-display">🛒 Recupero de carritos</h2>
        <span className="text-xs font-bold bg-[#FEF3C7] text-[#92400E] px-2.5 py-1 rounded-full">
          {pending.length} pendientes
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer bg-white text-[#5A4D3F] border border-[#E3D6BE]"
          >
            {showAll ? 'Ver pendientes' : 'Ver todos'}
          </button>
          <button onClick={load} className="p-2 bg-white border border-[#E3D6BE] rounded-full cursor-pointer" title="Recargar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-[#8A7969]">
        Se registran solos cuando alguien deja su email en el checkout sin comprar. Si después compra, se marcan recuperados automáticamente.
      </p>

      {shown.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5D7BF] p-8 text-center">
          <div className="text-3xl mb-2">🎉</div>
          <p className="text-sm font-bold text-[#1B4E43]">Sin carritos pendientes. ¡Todo vendido!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {shown.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-[#E5D7BF] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#2B231D]">
                    {r.customerName} <span className="font-semibold text-[#8A7969]">· {r.customerEmail}</span>
                  </p>
                  <p className="text-xs text-[#5B4E41] mt-1">{r.itemsSummary}</p>
                  <p className="text-[11px] text-[#8A7969] mt-0.5">
                    {r.itemsCount} u. · <strong className="text-[#1B4E43]">{formatARS(r.total)}</strong> ·{' '}
                    {new Date(r.createdAt).toLocaleString('es-AR')} ·{' '}
                    <span className={`font-bold uppercase ${r.status === 'pending' ? 'text-[#B45309]' : r.status === 'recovered' ? 'text-[#15803D]' : 'text-[#8A7969]'}`}>
                      {r.status === 'pending' ? 'Pendiente' : r.status === 'recovered' ? 'Recuperado' : 'Descartado'}
                    </span>
                  </p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex shrink-0 gap-1.5">
                    {r.customerPhone && (
                      <a
                        href={waLink(r.customerPhone, waText(r))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#1DA851] text-white text-xs font-bold px-3 py-1.5 rounded-xl"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Recuperar
                      </a>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          await markRecoveryDone(r.customerEmail);
                          setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'recovered' as const } : x)));
                        } catch {
                          notify('No se pudo marcar.');
                        }
                      }}
                      className="p-2 bg-[#DCFCE7] text-[#15803D] rounded-xl hover:bg-[#BBF7D0] cursor-pointer"
                      title="Marcar recuperado"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await dismissRecovery(r.id);
                          setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'dismissed' as const } : x)));
                        } catch {
                          notify('No se pudo descartar.');
                        }
                      }}
                      className="p-2 bg-[#F3F4F6] text-[#6B7280] rounded-xl hover:bg-[#E5E7EB] cursor-pointer"
                      title="Descartar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
