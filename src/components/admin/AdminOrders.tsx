import React, { useMemo, useState } from 'react';
import { OrderDetails, Product, StoreSettings } from '../../types';
import { updateCloudOrderStatus, deleteCloudOrder, restockForOrder } from '../../lib/cloudDb';
import { formatARS } from '../../lib/storeSettings';
import { Trash2, Phone, MapPin, Truck, Package, Search, Download, RefreshCw, Printer, CheckSquare, Megaphone } from 'lucide-react';

interface Props {
  orders: OrderDetails[];
  products: Product[];
  settings: StoreSettings;
  onReload: () => void;
  onOrdersChange: (orders: OrderDetails[]) => void;
  onProductsChange: (products: Product[]) => void;
  notify: (msg: string) => void;
}

const STATUS = ['todas', 'pendiente', 'pago_pendiente', 'pagado', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'] as const;

const STATUS_STYLE: Record<string, string> = {
  pendiente: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  pago_pendiente: 'bg-[#FEF9C3] text-[#854D0E] border-[#FDE68A]',
  pagado: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
  confirmado: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
  preparando: 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]',
  enviado: 'bg-[#FFEDD5] text-[#9A3412] border-[#FDBA74]',
  entregado: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
  cancelado: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]',
};

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  pago_pendiente: 'Pago pendiente',
  pagado: 'Pagado',
  confirmado: 'Confirmado',
  preparando: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const QUICK_FILTERS: { id: string; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendientes', label: '⏳ Pendientes' },
  { id: 'para-enviar', label: '📦 Para enviar' },
  { id: 'sin-tracking', label: '🚚 Enviados sin seguimiento' },
  { id: 'entregados', label: '🏠 Entregados' },
  { id: 'cancelados', label: '❌ Cancelados' },
];

export const AdminOrders: React.FC<Props> = ({ orders, products, settings, onReload, onOrdersChange, onProductsChange, notify }) => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('todas');
  const [quick, setQuick] = useState<string>('todos');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingTracking, setEditingTracking] = useState<Record<string, string>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('preparando');

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    return orders.filter((o) => {
      if (status !== 'todas' && (o.status || 'pendiente') !== status) return false;
      const st = o.status || 'pendiente';
      if (quick === 'pendientes' && !['pendiente', 'pago_pendiente'].includes(st)) return false;
      if (quick === 'para-enviar' && !['confirmado', 'preparando', 'pagado'].includes(st)) return false;
      if (quick === 'sin-tracking' && !(st === 'enviado' && !o.trackingCode)) return false;
      if (quick === 'entregados' && st !== 'entregado') return false;
      if (quick === 'cancelados' && st !== 'cancelado') return false;
      if (!query) return true;
      return (
        o.orderId.toLowerCase().includes(query) ||
        o.customerName.toLowerCase().includes(query) ||
        o.customerPhone.toLowerCase().includes(query) ||
        (o.address || '').toLowerCase().includes(query)
      );
    });
  }, [orders, q, status, quick]);

  const revenue = useMemo(
    () => filtered.filter((o) => !['cancelado'].includes(o.status || 'pendiente')).reduce((s, o) => s + (o.total || 0), 0),
    [filtered]
  );

  const stampHistory = (o: OrderDetails, to: string) => [
    ...(o.history || []),
    { at: new Date().toISOString(), from: o.status || 'pendiente', to, by: 'admin' },
  ];

  const handleStatus = async (order: OrderDetails, newStatus: string) => {
    setActionError(null);
    const old = order.status || 'pendiente';
    if (old === newStatus) return;
    try {
      // Al cancelar se devuelve el stock automáticamente
      if (newStatus === 'cancelado' && old !== 'cancelado') {
        const updatedProducts = await restockForOrder(order, products);
        onProductsChange(updatedProducts);
        notify(`↩️ Stock devuelto por cancelación del pedido ${order.orderId}.`);
      }
      await updateCloudOrderStatus(order.orderId, { status: newStatus as any, history: stampHistory(order, newStatus) });
      onOrdersChange(orders.map((o) => (o.orderId === order.orderId ? { ...o, status: newStatus, history: stampHistory(o, newStatus) } : o)));
      notify(`✅ Pedido ${order.orderId}: ${STATUS_LABEL[old] || old} → ${STATUS_LABEL[newStatus] || newStatus}.`);
    } catch (e: any) {
      setActionError(e.message || 'No se pudo actualizar el pedido.');
    }
  };

  const handleSaveTracking = async (order: OrderDetails) => {
    setActionError(null);
    const patch: any = {};
    if (editingTracking[order.orderId] !== undefined) patch.trackingCode = editingTracking[order.orderId];
    if (editingNotes[order.orderId] !== undefined) patch.adminNotes = editingNotes[order.orderId];
    try {
      await updateCloudOrderStatus(order.orderId, patch);
      onOrdersChange(orders.map((o) => (o.orderId === order.orderId ? { ...o, ...patch } : o)));
      notify(`✅ Seguimiento y notas guardados en ${order.orderId}.`);
    } catch (e: any) {
      setActionError(e.message || 'No se pudo guardar.');
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm(`¿Eliminar el pedido ${orderId}?`)) return;
    setActionError(null);
    try {
      await deleteCloudOrder(orderId);
      onOrdersChange(orders.filter((o) => o.orderId !== orderId));
      setSelected((prev) => prev.filter((id) => id !== orderId));
    } catch (e: any) {
      setActionError(e.message || 'No se pudo eliminar.');
    }
  };

  // WhatsApp con mensaje según el estado real del pedido
  const waStatusMessage = (o: OrderDetails) => {
    const st = o.status || 'pendiente';
    const base = `¡Hola ${o.customerName}! Te escribimos de ${settings.storeName} por tu pedido ${o.orderId} (${formatARS(o.total)}).`;
    switch (st) {
      case 'confirmado':
        return `${base} Ya lo confirmamos y lo estamos preparando.`;
      case 'pagado':
        return `${base} Recibimos tu pago. Ya lo estamos preparando.`;
      case 'preparando':
        return `${base} Lo estamos preparando con mucho cuidado. Te avisamos cuando salga.`;
      case 'enviado':
        return `${base} ¡Ya está en camino! ${o.trackingCode ? `Seguilo con el código ${o.trackingCode}.` : 'Te pasamos el seguimiento a la brevedad.'}`;
      case 'entregado':
        return `${base} Figura como entregado. ¿Llegó todo bien? ¡Gracias por tu compra!`;
      case 'cancelado':
        return `${base} Quedó cancelado. Si fue un error, escribinos y lo reactivamos.`;
      case 'pago_pendiente':
        return `${base} Te falta completar el pago online para confirmarlo. ¿Te ayudamos?`;
      default:
        return `${base} Estado actual: ${STATUS_LABEL[st] || st}.`;
    }
  };

  const waLinkFor = (o: OrderDetails, text?: string) => {
    const clean = (o.customerPhone || '').replace(/\D/g, '');
    if (!clean) return null;
    const phone = clean.startsWith('54') ? clean : '54' + clean;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text || waStatusMessage(o))}`;
  };

  // Remito imprimible para el envío
  const printRemito = (o: OrderDetails) => {
    const rows = (o.items || [])
      .map((it) => `<tr><td>${it.product.name} (${it.selectedVariant.weight})</td><td style="text-align:center">${it.quantity}</td></tr>`)
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Remito ${o.orderId}</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#222}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border:1px solid #999;padding:8px;font-size:14px}.box{border:1px solid #999;border-radius:8px;padding:12px;margin:12px 0;font-size:14px}</style>
      </head><body>
      <h1>${settings.storeName} — Remito ${o.orderId}</h1>
      <p>Fecha: ${o.createdAt} · Estado: ${STATUS_LABEL[o.status || 'pendiente'] || o.status} · Pago: ${o.paymentMethod}</p>
      <div class="box"><strong>Cliente:</strong> ${o.customerName} · ${o.customerPhone}${o.customerEmail ? ` · ${o.customerEmail}` : ''}<br>
      <strong>Entrega:</strong> ${o.deliveryMethod === 'pickup' ? 'Entrega coordinada' : o.address}<br>
      ${o.trackingCode ? `<strong>Seguimiento:</strong> ${o.trackingCode}<br>` : ''}
      ${o.notes ? `<strong>Notas:</strong> ${o.notes}` : ''}</div>
      <table><tr><th>Producto</th><th>Cant.</th></tr>${rows}</table>
      <p><strong>Total: ${formatARS(o.total)}</strong> (Subtotal ${formatARS(o.subtotal)} · Desc. ${formatARS(o.discount)} · Envío ${formatARS(o.shippingCost)})</p>
      <script>window.onload = () => window.print();<\/script>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((o) => o.orderId));
  };

  const applyBulk = async () => {
    setActionError(null);
    let currentProducts = products;
    let done = 0;
    for (const id of selected) {
      const o = orders.find((x) => x.orderId === id);
      if (!o || (o.status || 'pendiente') === bulkStatus) continue;
      try {
        if (bulkStatus === 'cancelado' && (o.status || 'pendiente') !== 'cancelado') {
          currentProducts = await restockForOrder(o, currentProducts);
        }
        const history = stampHistory(o, bulkStatus);
        await updateCloudOrderStatus(id, { status: bulkStatus as any, history });
        done++;
      } catch { /* sigue con el resto */ }
    }
    if (currentProducts !== products) onProductsChange(currentProducts);
    const updatedMap = new Map(selected.map((id) => [id, true]));
    onOrdersChange(
      orders.map((o) =>
        updatedMap.has(o.orderId) && (o.status || 'pendiente') !== bulkStatus
          ? { ...o, status: bulkStatus, history: stampHistory(o, bulkStatus) }
          : o
      )
    );
    setSelected([]);
    notify(`✅ ${done} pedidos pasados a "${STATUS_LABEL[bulkStatus] || bulkStatus}".`);
  };

  const deleteBulk = async () => {
    if (selected.length === 0) return;
    if (!confirm(`¿Eliminar ${selected.length} pedidos seleccionados?`)) return;
    for (const id of selected) {
      try {
        await deleteCloudOrder(id);
      } catch { /* sigue */ }
    }
    onOrdersChange(orders.filter((o) => !selected.includes(o.orderId)));
    setSelected([]);
    notify(`🗑️ Pedidos eliminados.`);
  };

  const exportCSV = () => {
    const rows = [
      ['Pedido', 'Fecha', 'Cliente', 'Teléfono', 'Email', 'Entrega', 'Dirección', 'Pago', 'Estado', 'Seguimiento', 'Subtotal', 'Descuento', 'Envío', 'Total'].join(';'),
      ...filtered.map((o) =>
        [o.orderId, o.createdAt, `"${o.customerName}"`, o.customerPhone, o.customerEmail, o.deliveryMethod, `"${(o.address || '').replace(/"/g, "'")}"`, o.paymentMethod, o.status || 'pendiente', o.trackingCode || '', o.subtotal, o.discount, o.shippingCost, o.total].join(';')
      ),
    ].join('\n');
    const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-la-joaquina-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-bold text-xs">{actionError}</div>
      )}

      <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-[#8A7969] absolute left-3 top-2.5" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por pedido, cliente, teléfono o dirección..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl outline-none focus:ring-2 focus:ring-[#1B4E43]"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2 font-semibold outline-none cursor-pointer"
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>{s === 'todas' ? 'Todos los estados' : STATUS_LABEL[s] || s}</option>
            ))}
          </select>
          <span className="text-xs font-bold text-[#1B4E43] bg-[#E8F3EF] px-3 py-1.5 rounded-xl">
            {filtered.length} pedidos · {formatARS(revenue)}
          </span>
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1B4E43] text-white px-3 py-2 rounded-xl cursor-pointer hover:bg-[#256B5C]">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
          <button onClick={onReload} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B4E43] hover:underline cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setQuick(f.id)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                quick === f.id
                  ? 'bg-[#1B4E43] text-white border-[#1B4E43]'
                  : 'bg-[#FAF5EC] text-[#5A4D3F] border-[#E3D6BE] hover:border-[#1B4E43]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="bg-[#1B4E43] text-white rounded-2xl p-3 flex flex-wrap items-center gap-2.5 shadow-md sticky top-2 z-10">
          <span className="text-xs font-bold flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-[#EFA332]" /> {selected.length} seleccionados
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="text-xs bg-white/10 border border-white/25 rounded-xl px-2.5 py-1.5 font-bold outline-none cursor-pointer"
          >
            {STATUS.filter((s) => s !== 'todas').map((s) => (
              <option key={s} value={s} className="text-black">{STATUS_LABEL[s] || s}</option>
            ))}
          </select>
          <button onClick={applyBulk} className="text-xs font-black bg-[#EFA332] text-[#1E170E] px-3.5 py-1.5 rounded-xl cursor-pointer hover:bg-[#FFD66B]">
            Aplicar estado
          </button>
          <button onClick={deleteBulk} className="text-xs font-bold bg-red-600/90 hover:bg-red-600 px-3.5 py-1.5 rounded-xl cursor-pointer">
            Eliminar
          </button>
          <button onClick={() => setSelected([])} className="text-xs font-bold text-white/70 hover:text-white underline cursor-pointer ml-auto">
            Limpiar
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-10 text-center text-xs text-[#8A7969]">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-bold text-sm text-[#3D3025]">No hay pedidos con ese filtro</p>
          <p className="mt-1">Las compras de la tienda aparecen acá con stock descontado, datos de envío y pago.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-[#5A4D3F] cursor-pointer select-none px-1">
            <input
              type="checkbox"
              checked={filtered.length > 0 && selected.length === filtered.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-[#1B4E43] cursor-pointer"
            />
            Seleccionar todos ({filtered.length})
          </label>
          {filtered.map((o) => {
            const st = o.status || 'pendiente';
            const isOpen = expanded === o.orderId;
            const wa = waLinkFor(o);
            const checked = selected.includes(o.orderId);
            return (
              <div key={o.orderId} className={`bg-[#FFFDF9] border rounded-2xl shadow-xs overflow-hidden transition-colors ${checked ? 'border-[#1B4E43] ring-1 ring-[#1B4E43]' : 'border-[#E5D7BF]'}`}>
                <div className="p-4 flex flex-wrap items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelect(o.orderId)}
                    className="w-4 h-4 accent-[#1B4E43] cursor-pointer shrink-0"
                    title="Seleccionar para acción masiva"
                  />
                  <div className="min-w-[180px] flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm font-black text-[#1B4E43] font-display">{o.orderId}</strong>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${STATUS_STYLE[st] || STATUS_STYLE.pendiente}`}>
                        {STATUS_LABEL[st] || st}
                      </span>
                      {st === 'enviado' && !o.trackingCode && (
                        <span className="text-[10px] font-bold text-[#9A3412] bg-[#FFEDD5] px-2 py-0.5 rounded-full">⚠️ sin seguimiento</span>
                      )}
                    </div>
                    <p className="text-xs text-[#5A4D3F] mt-1">
                      <strong>{o.customerName}</strong> · {o.customerPhone} · {o.createdAt}
                    </p>
                    <p className="text-[11px] text-[#6A5949] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#DE5D4E]" />
                      {o.deliveryMethod === 'pickup' ? 'Entrega coordinada' : o.address} · {o.paymentMethod} · <strong className="text-[#1B4E43]">{formatARS(o.total)}</strong>
                    </p>
                  </div>
                  <select
                    value={st}
                    onChange={(e) => handleStatus(o, e.target.value)}
                    className="text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-2.5 py-2 font-bold cursor-pointer outline-none"
                    title="Cambiar estado: avisa, registra historial y devuelve stock si se cancela"
                  >
                    {STATUS.filter((s) => s !== 'todas').map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
                    ))}
                  </select>
                  <button onClick={() => setExpanded(isOpen ? null : o.orderId)} className="text-xs font-bold text-[#1B4E43] bg-[#E8F3EF] px-3 py-2 rounded-xl cursor-pointer hover:bg-[#D8EAE3]">
                    {isOpen ? 'Ocultar detalle' : 'Ver detalle / envío'}
                  </button>
                  <button onClick={() => handleDelete(o.orderId)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl cursor-pointer" title="Eliminar pedido">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#FAF5EC] border border-[#E8DFC9] rounded-xl p-3 space-y-1.5">
                      <p className="font-bold text-[#1B4E43] flex items-center gap-1.5"><Truck className="w-4 h-4" /> Detalle de envío y cliente</p>
                      <p><strong>Nombre:</strong> {o.customerName}</p>
                      <p><strong>Tel/WhatsApp:</strong> {o.customerPhone}</p>
                      {o.customerEmail && <p><strong>Email:</strong> {o.customerEmail}</p>}
                      <p><strong>Método:</strong> {o.deliveryMethod === 'pickup' ? `Entrega coordinada (${settings.address})` : o.deliveryMethod === 'express_amba' ? 'Envío AMBA' : 'Correo Argentino'}</p>
                      <p><strong>Dirección:</strong> {o.address}</p>
                      {o.notes && <p><strong>Notas del cliente:</strong> {o.notes}</p>}
                      <p><strong>Pago:</strong> {o.paymentMethod} · Subtotal {formatARS(o.subtotal)} · Desc. {formatARS(o.discount)} · Envío {formatARS(o.shippingCost)} · <strong>Total {formatARS(o.total)}</strong></p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {wa && (
                          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-[#25D366] text-white font-bold px-3 py-1.5 rounded-xl">
                            <Megaphone className="w-3.5 h-3.5" /> Avisar estado por WhatsApp
                          </a>
                        )}
                        <button onClick={() => printRemito(o)} className="inline-flex items-center gap-1.5 bg-[#1B4E43] text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer hover:bg-[#256B5C]">
                          <Printer className="w-3.5 h-3.5" /> Imprimir remito
                        </button>
                      </div>
                      {o.history && o.history.length > 0 && (
                        <div className="pt-2 mt-1 border-t border-[#E8DFC9]">
                          <p className="font-bold text-[#1B4E43] mb-1.5">Historial del pedido</p>
                          <div className="space-y-1">
                            {o.history.map((h, i) => (
                              <div key={i} className="flex items-center gap-2 text-[11px] text-[#5A4D3F]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1B4E43] shrink-0" />
                                <span>
                                  {STATUS_LABEL[h.from] || h.from} → <strong>{STATUS_LABEL[h.to] || h.to}</strong>
                                  <span className="text-[#8A7969]"> · {new Date(h.at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-[#FAF5EC] border border-[#E8DFC9] rounded-xl p-3 space-y-2">
                      <p className="font-bold text-[#1B4E43]">Productos del pedido</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {(o.items || []).map((it, i) => (
                          <div key={i} className="flex justify-between gap-2 bg-white border border-[#EFE8D8] rounded-lg px-2.5 py-1.5">
                            <span className="font-semibold">{it.product.name} <span className="text-[#8A7969]">({it.selectedVariant.weight}) x{it.quantity}</span></span>
                            <strong>{formatARS(it.selectedVariant.price * it.quantity)}</strong>
                          </div>
                        ))}
                      </div>
                      <label className="block font-bold text-[#5B4E41]">Código de seguimiento</label>
                      <input
                        value={editingTracking[o.orderId] ?? o.trackingCode ?? ''}
                        onChange={(e) => setEditingTracking({ ...editingTracking, [o.orderId]: e.target.value })}
                        placeholder="Ej: CA123456789AR"
                        className="w-full p-2 bg-white border border-[#E3D6BE] rounded-xl outline-none"
                      />
                      <label className="block font-bold text-[#5B4E41]">Notas internas</label>
                      <input
                        value={editingNotes[o.orderId] ?? o.adminNotes ?? ''}
                        onChange={(e) => setEditingNotes({ ...editingNotes, [o.orderId]: e.target.value })}
                        placeholder="Ej: entregar después de las 18h"
                        className="w-full p-2 bg-white border border-[#E3D6BE] rounded-xl outline-none"
                      />
                      <button onClick={() => handleSaveTracking(o)} className="bg-[#1B4E43] text-white font-bold px-4 py-2 rounded-xl cursor-pointer hover:bg-[#256B5C]">
                        Guardar seguimiento y notas
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
