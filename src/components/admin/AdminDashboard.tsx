import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Banknote, 
  Receipt, 
  Package, 
  Bell, 
  TrendingUp, 
  ArrowRight,
  BarChart3,
  Calendar,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
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
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (!isNaN(d.getTime())) {
      const timeMatch = s.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        d.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
      }
      return d;
    }
  }
  const direct = new Date(s);
  if (!isNaN(direct.getTime())) return direct;
  return null;
}

const RevenueTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-[#1E170E] text-[#FFFDF9] p-3 rounded-xl shadow-xl border border-[#E5D7BF]/30 text-xs space-y-1.5 min-w-[190px] z-50">
        <div className="font-bold text-[#FAF5EC] flex items-center justify-between border-b border-[#FAF5EC]/15 pb-1.5">
          <span>{item.label}, {item.full}</span>
          <span className="text-[10px] bg-[#1B4E43] text-[#E8F3EF] px-1.5 py-0.5 rounded font-mono font-bold">
            {item.pedidos} {item.pedidos === 1 ? 'pedido' : 'pedidos'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#A89887]">Ventas Totales:</span>
          <span className="font-extrabold text-[#F5B44A] text-sm font-display">
            {formatARS(item.value)}
          </span>
        </div>
        {item.pedidos > 0 && (
          <div className="flex items-center justify-between gap-3 text-[11px] text-[#C4B7A6]">
            <span>Ticket Promedio:</span>
            <span className="font-semibold text-white">{formatARS(item.ticketPromedio)}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const CAT_COLORS: Record<string, string> = {
  perros: '#1B4E43',
  gatos: '#EFA332',
  otras: '#0D9488',
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
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
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

  // Ventas últimos 7 días enriquecidas para Recharts
  const week = useMemo(() => {
    const days: {
      key: string;
      label: string;
      full: string;
      value: number;
      pedidos: number;
      ticketPromedio: number;
      isToday: boolean;
    }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const rawLabel = d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');
      const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
      const full = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
      days.push({
        key: d.toISOString().split('T')[0],
        label,
        full,
        value: 0,
        pedidos: 0,
        ticketPromedio: 0,
        isToday: i === 0,
      });
    }
    for (const o of validOrders) {
      const dt = parseOrderDate(o.createdAt);
      if (!dt) continue;
      dt.setHours(0, 0, 0, 0);
      const diff = Math.floor((today.getTime() - dt.getTime()) / 86400000);
      const idx = diff <= 0 ? 6 : 6 - diff;
      if (idx >= 0 && idx <= 6) {
        days[idx].value += o.total || 0;
        days[idx].pedidos += 1;
      }
    }
    for (const d of days) {
      d.ticketPromedio = d.pedidos > 0 ? Math.round(d.value / d.pedidos) : 0;
    }
    return days;
  }, [validOrders]);

  const weekTotal = useMemo(() => week.reduce((s, d) => s + d.value, 0), [week]);
  const weekOrdersCount = useMemo(() => week.reduce((s, d) => s + d.pedidos, 0), [week]);
  const weekDailyAvg = useMemo(() => Math.round(weekTotal / 7), [weekTotal]);
  const maxDayVal = useMemo(() => Math.max(0, ...week.map((d) => d.value)), [week]);
  const bestDay = useMemo(() => {
    const sorted = [...week].sort((a, b) => b.value - a.value);
    return sorted[0] && sorted[0].value > 0 ? sorted[0] : null;
  }, [week]);

  // Catálogo por categoría (donut)
  const catCounts = useMemo(() => {
    const cats = ['perros', 'gatos', 'otras', 'piedras', 'accesorios'];
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
        <div className="lg:col-span-3 bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header with Title & Chart Mode Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E8F3EF] text-[#1B4E43] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1B4E43]">
                    Ventas Diarias (Últimos 7 días)
                  </h3>
                  <p className="text-[11px] text-[#8A7969]">
                    Monitoreo y evolución de ingresos diarios
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Switcher Area / Bar */}
                <div className="inline-flex rounded-lg bg-[#FAF5EC] border border-[#E5D7BF] p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartType('area')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      chartType === 'area'
                        ? 'bg-[#1B4E43] text-white shadow-xs'
                        : 'text-[#7A6A59] hover:text-[#1B4E43]'
                    }`}
                    title="Vista de Área y Tendencia"
                  >
                    <Layers className="w-3 h-3" /> Área
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      chartType === 'bar'
                        ? 'bg-[#1B4E43] text-white shadow-xs'
                        : 'text-[#7A6A59] hover:text-[#1B4E43]'
                    }`}
                    title="Vista de Barras por Día"
                  >
                    <BarChart3 className="w-3 h-3" /> Barras
                  </button>
                </div>

                <button
                  onClick={() => onGoTo('ventas')}
                  className="text-[11px] font-bold text-[#1B4E43] hover:underline cursor-pointer flex items-center gap-0.5 ml-1"
                >
                  Ver ventas <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Micro KPIs for revenue management */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 pt-1 border-t border-[#F2ECE1]">
              <div className="bg-[#FAF7F2] rounded-xl p-2.5 border border-[#EFE8D8]">
                <span className="text-[10px] uppercase font-bold text-[#8A7969] block">Total 7 días</span>
                <strong className="text-xs sm:text-sm font-extrabold text-[#1B4E43] font-display block truncate">
                  {formatARS(weekTotal)}
                </strong>
              </div>
              <div className="bg-[#FAF7F2] rounded-xl p-2.5 border border-[#EFE8D8]">
                <span className="text-[10px] uppercase font-bold text-[#8A7969] block">Promedio diario</span>
                <strong className="text-xs sm:text-sm font-extrabold text-[#3D3025] font-display block truncate">
                  {formatARS(weekDailyAvg)}
                </strong>
              </div>
              <div className="bg-[#FAF7F2] rounded-xl p-2.5 border border-[#EFE8D8]">
                <span className="text-[10px] uppercase font-bold text-[#8A7969] block">Pedidos 7d</span>
                <strong className="text-xs sm:text-sm font-extrabold text-[#3D3025] font-display block truncate">
                  {weekOrdersCount} {weekOrdersCount === 1 ? 'pedido' : 'pedidos'}
                </strong>
              </div>
              <div className="bg-[#FAF7F2] rounded-xl p-2.5 border border-[#EFE8D8]">
                <span className="text-[10px] uppercase font-bold text-[#8A7969] block">Día récord</span>
                <strong className="text-xs sm:text-sm font-extrabold text-[#D97706] font-display truncate block">
                  {bestDay ? `${bestDay.label} (${formatARS(bestDay.value)})` : '-'}
                </strong>
              </div>
            </div>
          </div>

          {/* Recharts Chart Container */}
          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={week} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B4E43" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#1B4E43" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFE7D8" />
                  <XAxis 
                    dataKey="label" 
                    tickLine={false} 
                    axisLine={{ stroke: '#E5D7BF' }}
                    tick={{ fill: '#7A6A59', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#8A7969', fontSize: 10 }}
                    tickFormatter={(val) => {
                      if (val === 0) return '$0';
                      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `$${Math.round(val / 1000)}k`;
                      return `$${val}`;
                    }}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#1B4E43"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                    activeDot={{ r: 6, fill: '#EFA332', stroke: '#FFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={week} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFE7D8" />
                  <XAxis 
                    dataKey="label" 
                    tickLine={false} 
                    axisLine={{ stroke: '#E5D7BF' }}
                    tick={{ fill: '#7A6A59', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#8A7969', fontSize: 10 }}
                    tickFormatter={(val) => {
                      if (val === 0) return '$0';
                      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `$${Math.round(val / 1000)}k`;
                      return `$${val}`;
                    }}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {week.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.value === maxDayVal && maxDayVal > 0 ? '#EFA332' : entry.isToday ? '#256B5C' : '#1B4E43'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
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
