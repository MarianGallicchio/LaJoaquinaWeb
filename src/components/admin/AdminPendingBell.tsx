import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Product, OrderDetails, StockAlert } from '../../types';
import { fetchAllReviewsAdmin, fetchRecoveries } from '../../lib/cloudDb';

type TabId = 'ventas' | 'recupero' | 'resenas' | 'movimientos' | 'productos' | 'mayoristas' | 'envios' | 'herramientas' | 'resumen' | 'equipo';

interface Props {
  orders: OrderDetails[];
  alerts: StockAlert[];
  products: Product[];
  canVentas: boolean;
  canProductos: boolean;
  canComercio: boolean;
  onGo: (t: TabId) => void;
}

// Campana única con todo lo que requiere acción (evita recorrer tab por tab)
export const AdminPendingBell: React.FC<Props> = ({ orders, alerts, products, canVentas, canProductos, canComercio, onGo }) => {
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState<{ reviews: number | null; recoveries: number | null }>({ reviews: null, recoveries: null });
  const [loadingExtra, setLoadingExtra] = useState(false);

  const pendingOrders = orders.filter((o) => ['pendiente', 'pago_pendiente'].includes(o.status || 'pendiente')).length;
  const pendingAlerts = alerts.filter((a) => a.status === 'pending').length;
  const lowStock = products.reduce(
    (s, p) =>
      s +
      (p.variants || []).filter(
        (v) => v.inStock === false || (typeof v.stock === 'number' && v.stock <= (typeof v.minStock === 'number' ? v.minStock : 5))
      ).length,
    0
  );

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && extra.reviews === null && canComercio) {
      setLoadingExtra(true);
      Promise.all([fetchAllReviewsAdmin().catch(() => []), fetchRecoveries().catch(() => [])])
        .then(([revs, recs]) => {
          setExtra({
            reviews: revs.filter((r) => !r.approved).length,
            recoveries: recs.filter((r) => r.status === 'pending').length,
          });
        })
        .finally(() => setLoadingExtra(false));
    }
  };

  interface PendingItem {
    label: string;
    count: number | null;
    tab: TabId;
    show: boolean;
  }

  const items: PendingItem[] = [
    { label: 'Pedidos por atender', count: pendingOrders, tab: 'ventas' as TabId, show: canVentas },
    { label: 'Carritos por recuperar', count: canVentas ? extra.recoveries : 0, tab: 'recupero' as TabId, show: canVentas },
    { label: 'Reseñas por aprobar', count: canComercio ? extra.reviews : 0, tab: 'resenas' as TabId, show: canComercio },
    { label: 'Presentaciones con stock bajo', count: lowStock, tab: 'movimientos' as TabId, show: canProductos },
    { label: 'Alertas de clientes', count: pendingAlerts, tab: 'productos' as TabId, show: canProductos },
  ].filter((i) => i.show);

  const total = items.reduce((s, i) => s + (typeof i.count === 'number' ? i.count : 0), 0);

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative inline-flex items-center gap-1.5 text-xs font-bold bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-3 py-2 rounded-xl cursor-pointer transition-colors"
        title="Todo lo pendiente en un solo lugar"
      >
        <Bell className="w-4 h-4" />
        <span className="hidden sm:inline">Pendientes</span>
        {total > 0 && (
          <span className="bg-[#B91C1C] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
            {total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl shadow-2xl z-50 overflow-hidden">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#8A7969] px-4 pt-3 pb-1">
              Requieren tu acción
            </p>
            {items.map((i) => (
              <button
                key={i.tab}
                onClick={() => {
                  setOpen(false);
                  onGo(i.tab);
                }}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-[#FAF5EC] text-left cursor-pointer transition-colors"
              >
                <span className="text-xs font-bold text-[#2B231D]">{i.label}</span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${(i.count || 0) > 0 ? 'bg-[#B91C1C] text-white' : 'bg-[#E8DFC9] text-[#8A7969]'}`}>
                  {loadingExtra && i.count === null ? '…' : i.count ?? 0}
                </span>
              </button>
            ))}
            {total === 0 && (
              <p className="text-xs text-[#15803D] font-bold px-4 pb-3">🎉 Todo al día, nada pendiente.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
