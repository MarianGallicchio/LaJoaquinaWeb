import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Banknote, Receipt, Package, Bell, TrendingUp, ArrowRight } from 'lucide-react';
import { Product, OrderDetails, StockAlert } from '../../types';
import { formatARS } from '../../lib/storeSettings';

interface Props {
  products: Product[];
  orders: OrderDetails[];
  alerts: StockAlert[];
  onGoTo: (tab: string) => void;
}

function parseOrderDate(s: string): Date | null {
  if (!s) return null;
  const direct = new Date(s);
  if (!isNaN(direct.getTime())) return direct;
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

const CAT_COLORS: Record<string, string> = {
  perros: '#1B4E43',
  gatos: '#EFA332',
  piedras: '#7C3AED',
  accesorios: '#DE5D4E',
};

const STATUS_LABELS: Record<string, string> = {
  pendiente: '⏳ Pendiente',
  pago_pendiente: '💳 Pago pendiente',
  pagado: '💰 Pagado',
  confirmado: '✅ Confirmado',
  preparando: '📦 En preparación',
  enviado: '🚚 Enviado',
  entregado: '🏠 Entregado',
  cancelado: '❌ Cancelado',
};

export const AdminDashboard: React.FC<Props> = ({ products, orders, alerts, onGoTo }) => {
  const validOrders = useMemo(() => orders.filter((o) => (o.status || 'pendiente') !== 'cancelado'), [orders]);
  const revenue = useMemo(() => validOrders.reduce((s, o) => s + (o.total || 0), 0), [validOrders]);
  const ticket = validOrders.length > 0 ? revenue / validOrders.length : 0;

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) {
      const st = (o.status || 'pendiente') as string;
      map[st] = (map[st] || 0) + 1;
    }
    return map;
  }, [orders]);

  const lowStock = useMemo(
    () =>
      products.flatMap((p) =>
        p.variants
          .filter((v) => v.inStock === false || (typeof v.stock === 'number' && v.stock <= 5))
          .map((v) => ({ product: p, variant: v }))
      ),
    [products]
  );

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const o of validOrders) {
      for (const i of o.items || []) {
        const key = i.product.id;
        if (!map[key]) map[key] = { name: i.product.name, qty: 0, revenue: 0 };
        map[key].qty += i.quantity;
        map[key].revenue += i.selectedVariant.price * i.quantity;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [validOrders]);

  // Ventas últimos 7 días
  const week = useMemo(() => {
    const days: { label: string; value: number; full: string }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({
        label: d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''),
        full: d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
        value: 0,
      });
    }
    for (const o of validOrders) {
      const dt = parseOrderDate(o.createdAt);
      if (!dt) continue;
      dt.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - dt.getTime()) / 86400000);
      if (diff >= 0 && diff <= 6) {
        days[6 - diff].value += o.total || 0;
      }
    }
    return days;
  }, [validOrders]);

  const maxDay = Math.max(1, ...week.map((d) => d.value));

  // Catálogo por categoría (donut)
  const catCounts = useMemo(() => {
    const cats = ['perros', 'gatos', 'piedras', 'accesorios'];
    return cats.map((c) => ({ cat: c, count: products.filter((p) => p.category === c).length }));
  }, [products]);

  const donut = useMemo(() => {
    const total = Math.max(1, catCounts.reduce((s, c) => s + c.count, 0));
    let acc = 0;
    const segs = catCounts.map((c) => {
      const from = (acc / total) * 360;
      acc += c.count;
      const to = (acc / total) * 360;
      return `${CAT_COLORS[c.cat]} ${from}deg ${to}deg`;
    });
    return `conic-gradient(${segs.join(', ')})`;
  }, [catCounts]);

  const pendingAlerts = alerts.filter((a) => a.status === 'pending').length;

  const cards = [
    { label: 'Ventas totales', value: formatARS(revenue), sub: `${validOrders.length} pedidos cobrables`, tab: 'ventas', icon: <Banknote className="w-5 h-5" />, grad: 'from-[#1B4E43] to-[#0F2E27]' },
    { label: 'Ticket promedio', value: formatARS(Math.round(ticket)), sub: 'por pedido', tab: 'ventas', icon: <Receipt className="w-5 h-5" />, grad: 'from-[#EFA332] to-[#C77B12]' },
    { label: 'Productos', value: String(products.length), sub: `${lowStock.length} con stock bajo`, tab: 'productos', icon: <Package className="w-5 h-5" />, grad: 'from-[#7C3AED] to-[#5B21B6]' },
    { label: 'Alertas de stock', value: String(pendingAlerts), sub: 'clientes esperando', tab: 'productos', icon: <Bell className="w-5 h-5" />, grad: 'from-[#DE5D4E] to-[#B91C1C]' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <motion.button
            key={c.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onGoTo(c.tab)}
            className={`text-left text-white p-4 rounded-2xl bg-gradient-to-br ${c.grad} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase opacity-80">{c.label}</span>
              <span className="opacity-80">{c.icon}</span>
            </div>
            <strong className="block text-xl sm:text-2xl font-extrabold font-display mt-1">{c.value}</strong>
            <span className="text-[11px] opacity-80">{c.sub}</span>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-[#1B4E43] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Ventas últimos 7 días
            </h3>
            <button onClick={() => onGoTo('ventas')} className="text-[11px] font-bold text-[#1B4E43] hover:underline cursor-pointer flex items-center gap-0.5">
              Ver ventas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {week.every((d) => d.value === 0) ? (
            <p className="text-xs text-[#8A7969] py-6 text-center">Sin ventas registradas en los últimos 7 días.</p>
          ) : (
            <div className="flex items-end gap-2 h-36">
              {week.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${d.full}: ${formatARS(d.value)}`}>
                  <span className="text-[9px] font-bold text-[#1B4E43]">{d.value > 0 ? `$${Math.round(d.value / 1000)}k` : ''}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, (d.value / maxDay) * 100)}%` }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 22 }}
                    className={`w-full rounded-t-lg ${i === 6 ? 'bg-[#EFA332]' : 'bg-[#1B4E43]'}`}
                    style={{ minHeight: 4 }}
                  />
                  <span className="text-[10px] font-bold text-[#8A7969] capitalize">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs">
          <h3 className="font-bold text-sm text-[#1B4E43] mb-3">Catálogo por categoría</h3>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full shrink-0 shadow-inner" style={{ background: donut }} />
            <div className="space-y-1.5 text-xs flex-1">
              {catCounts.map((c) => (
                <div key={c.cat} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CAT_COLORS[c.cat] }} />
                  <span className="font-semibold capitalize text-[#3D3025]">{c.cat}</span>
                  <strong className="ml-auto text-[#1B4E43]">{c.count}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#EFE8D8]">
            <h4 className="text-[11px] font-bold uppercase text-[#8A7969] mb-2">Pedidos por estado</h4>
            {orders.length === 0 ? (
              <p className="text-xs text-[#8A7969]">Todavía no hay pedidos.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(byStatus).map(([st, count]) => (
                  <span key={st} className="text-[11px] font-bold bg-[#FAF5EC] border border-[#EFE8D8] rounded-full px-2.5 py-1">
                    {STATUS_LABELS[st] || st} · {count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-[#1B4E43]">Stock bajo / agotado</h3>
            <button onClick={() => onGoTo('productos')} className="text-[11px] font-bold text-[#1B4E43] hover:underline cursor-pointer">Reponer →</button>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-xs text-[#256B5C] font-semibold">✅ Todo el catálogo tiene stock saludable.</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {lowStock.slice(0, 12).map(({ product, variant }, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-red-50/60 border border-red-100 rounded-xl px-3 py-2">
                  <span className="font-semibold text-[#3D3025] truncate">{product.name} · {variant.weight}</span>
                  <span className={`font-black shrink-0 ml-2 ${variant.inStock === false ? 'text-red-600' : 'text-[#8C5800]'}`}>
                    {variant.inStock === false ? 'Agotado' : `${variant.stock} u.`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs">
          <h3 className="font-bold text-sm text-[#1B4E43] mb-3">Lo más vendido (por facturación)</h3>
          {topProducts.length === 0 ? (
            <p className="text-xs text-[#8A7969]">Sin datos todavía.</p>
          ) : (
            <div className="divide-y divide-[#EFE8D8]">
              {topProducts.map((t, i) => (
                <div key={i} className="py-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#2B231D]">#{i + 1} {t.name} <span className="text-[#8A7969]">· {t.qty} u.</span></span>
                  <strong className="text-[#1B4E43]">{formatARS(t.revenue)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
