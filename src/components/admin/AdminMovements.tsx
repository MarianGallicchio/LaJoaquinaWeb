import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, TrendingDown, TrendingUp, Plus, Minus, AlertTriangle, MessageCircle } from 'lucide-react';
import { Product, StockMovement, Distributor } from '../../types';
import { fetchMovements, adjustStockManual, fetchCloudDistributors } from '../../lib/cloudDb';
import { waLink } from '../../lib/storeSettings';

interface Props {
  products: Product[];
  onProductsChange: (products: Product[]) => void;
  notify: (msg: string) => void;
  currentUserEmail?: string;
}

const REASON_LABEL: Record<string, string> = {
  venta: 'Venta',
  cancelacion: 'Cancelación',
  ajuste: 'Ajuste',
  carga: 'Carga',
};

// Auditoría de stock + ajuste manual (carga de mercadería o corrección)
export const AdminMovements: React.FC<Props> = ({ products, onProductsChange, notify, currentUserEmail }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [adjProduct, setAdjProduct] = useState('');
  const [adjVariant, setAdjVariant] = useState('');
  const [adjQty, setAdjQty] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [movs, dists] = await Promise.all([fetchMovements(), fetchCloudDistributors().catch(() => [])]);
      setMovements(movs);
      setDistributors(dists || []);
    } catch {
      notify('No se pudieron leer los movimientos.');
    } finally {
      setLoading(false);
    }
  };

  // Stock bajo según mínimo por variante (vacío = 5) + a quién pedirlo
  const lowStock = useMemo(() => {
    const out: { product: Product; variant: Product['variants'][number]; min: number; dist?: Distributor }[] = [];
    for (const p of products) {
      for (const v of p.variants || []) {
        if (v.inStock === false) {
          out.push({ product: p, variant: v, min: 0 });
          continue;
        }
        if (typeof v.stock !== 'number') continue;
        const min = typeof v.minStock === 'number' ? v.minStock : 5;
        if (v.stock <= min) {
          const brand = (p.brand || '').toLowerCase();
          const dist = distributors.find(
            (d) => d.active !== false && brand && (d.brands || '').toLowerCase().includes(brand)
          );
          out.push({ product: p, variant: v, min, dist });
        }
      }
    }
    return out;
  }, [products, distributors]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    if (!query) return movements;
    return movements.filter(
      (m) =>
        m.productName.toLowerCase().includes(query) ||
        (m.orderId || '').toLowerCase().includes(query) ||
        (REASON_LABEL[m.reason] || m.reason).toLowerCase().includes(query)
    );
  }, [movements, q]);

  const adjProductObj = products.find((p) => p.id === adjProduct);
  const doAdjust = async (sign: 1 | -1) => {
    if (!adjProduct || !adjVariant || adjQty < 1) {
      notify('Elegí producto, presentación y cantidad.');
      return;
    }
    try {
      const updated = await adjustStockManual(products, adjProduct, adjVariant, sign * adjQty, currentUserEmail || 'admin');
      onProductsChange(updated);
      notify(`Stock ${sign > 0 ? 'sumado' : 'restado'}: ${adjQty} u. (${adjVariant})`);
      load();
    } catch {
      notify('No se pudo ajustar el stock.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-extrabold text-[#1B4E43] font-display">📦 Movimientos de stock</h2>
        <button onClick={load} className="ml-auto p-2 bg-white border border-[#E3D6BE] rounded-full cursor-pointer" title="Recargar">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Ajuste manual */}
      <div className="bg-white rounded-2xl border border-[#E5D7BF] p-4">
        <p className="text-xs font-extrabold text-[#1B4E43] uppercase tracking-wider mb-2">Carga / corrección manual</p>
        <div className="grid sm:grid-cols-4 gap-2">
          <select
            value={adjProduct}
            onChange={(e) => {
              setAdjProduct(e.target.value);
              setAdjVariant('');
            }}
            className="text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-2.5 py-2 cursor-pointer"
          >
            <option value="">Producto...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={adjVariant}
            onChange={(e) => setAdjVariant(e.target.value)}
            className="text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-2.5 py-2 cursor-pointer"
          >
            <option value="">Presentación...</option>
            {(adjProductObj?.variants || []).map((v) => (
              <option key={v.weight} value={v.weight}>
                {v.weight} (stock: {typeof v.stock === 'number' ? v.stock : '∞'})
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={adjQty}
            onChange={(e) => setAdjQty(Math.max(1, Number(e.target.value) || 1))}
            className="text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-2.5 py-2"
            placeholder="Cantidad"
          />
          <div className="flex gap-2">
            <button
              onClick={() => doAdjust(1)}
              className="flex-1 flex items-center justify-center gap-1 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold py-2 rounded-xl cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Entrada
            </button>
            <button
              onClick={() => doAdjust(-1)}
              className="flex-1 flex items-center justify-center gap-1 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold py-2 rounded-xl cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" /> Salida
            </button>
          </div>
        </div>
      </div>

      {/* Stock bajo + a quién pedirlo */}
      {lowStock.length > 0 && (
        <div className="bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] p-4">
          <p className="text-xs font-extrabold text-[#92400E] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Stock bajo o agotado ({lowStock.length})
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lowStock.slice(0, 30).map(({ product, variant, min, dist }, i) => (
              <div key={`${product.id}-${variant.weight}-${i}`} className="flex items-center gap-2 bg-white rounded-xl border border-[#FDE68A] px-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#2B231D] truncate">
                    {product.name} <span className="font-semibold text-[#8A7969]">· {variant.weight}</span>
                  </p>
                  <p className="text-[11px] text-[#92400E] font-semibold">
                    {variant.inStock === false ? 'Agotado' : `Quedan ${variant.stock} u. (aviso en ${min})`}
                    {dist ? ` · Pedir a ${dist.name}` : ' · Sin distribuidor cargado para esta marca'}
                  </p>
                </div>
                {dist?.phone ? (
                  <a
                    href={waLink(dist.phone, `¡Hola ${dist.name}! Te escribo de La Joaquina Pet Shop. Necesito reponer "${product.name}" (${variant.weight}, marca ${product.brand}). ¿Me pasás disponibilidad y precio?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 bg-[#25D366] text-white font-bold px-2.5 py-1.5 rounded-xl"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Pedir
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      setAdjProduct(product.id);
                      setAdjVariant(variant.weight);
                      setAdjQty(10);
                    }}
                    className="shrink-0 bg-[#1B4E43] text-white font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"
                  >
                    Cargar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="bg-white rounded-2xl border border-[#E5D7BF] p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por producto, pedido o motivo..."
          className="w-full text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2 mb-3 outline-none focus:ring-1 focus:ring-[#1B4E43]"
        />
        {filtered.length === 0 ? (
          <p className="text-xs text-[#7A6A59] text-center py-6">
            Todavía no hay movimientos registrados. Se generan solos con cada venta, cancelación o ajuste.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto divide-y divide-[#F0E8D6]">
            {filtered.slice(0, 200).map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <span className={`p-1.5 rounded-lg shrink-0 ${m.change < 0 ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#DCFCE7] text-[#15803D]'}`}>
                  {m.change < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#2B231D] truncate">
                    {m.productName} <span className="font-semibold text-[#8A7969]">· {m.variantLabel}</span>
                  </p>
                  <p className="text-[11px] text-[#8A7969]">
                    {REASON_LABEL[m.reason] || m.reason}
                    {m.orderId ? ` · ${m.orderId}` : ''}
                    {m.by ? ` · ${m.by}` : ''} · {new Date(m.createdAt).toLocaleString('es-AR')}
                  </p>
                </div>
                <span className={`text-sm font-black tabular-nums shrink-0 ${m.change < 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
                  {m.change > 0 ? '+' : ''}{m.change}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
