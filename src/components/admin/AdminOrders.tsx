import React, { useMemo, useState } from 'react';
import { OrderDetails, StoreSettings } from '../../types';
import { updateCloudOrderStatus, deleteCloudOrder } from '../../lib/cloudDb';
import { formatARS } from '../../lib/storeSettings';
import { Trash2, Phone, MapPin, Truck, Package, Search, Download, RefreshCw } from 'lucide-react';

interface Props {
  orders: OrderDetails[];
  settings: StoreSettings;
  onReload: () => void;
  onOrdersChange: (orders: OrderDetails[]) => void;
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

export const AdminOrders: React.FC<Props> = ({ orders, settings, onReload, onOrdersChange }) => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('todas');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingTracking, setEditingTracking] = useState<Record<string, string>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    return orders.filter((o) => {
      if (status !== 'todas' && (o.status || 'pendiente') !== status) return false;
      if (!query) return true;
      return (
        o.orderId.toLowerCase().includes(query) ||
        o.customerName.toLowerCase().includes(query) ||
        o.customerPhone.toLowerCase().includes(query) ||
        (o.address || '').toLowerCase().includes(query)
      );
    });
  }, [orders, q, status]);

  const revenue = useMemo(
    () => filtered.filter((o) => (o.status || 'pendiente') !== 'cancelado').reduce((s, o) => s + (o.total || 0), 0),
    [filtered]
  );

  const handleStatus = async (orderId: string, newStatus: string) => {
    setActionError(null);
    try {
      await updateCloudOrderStatus(orderId, { status: newStatus as any });
      onOrdersChange(orders.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o)));
    } catch (e: any) {
      setActionError(e.message || 'No se pudo actualizar el pedido.');
    }
  };

  const handleSaveTracking = async (orderId: string) => {
    setActionError(null);
    const patch: any = {};
    if (editingTracking[orderId] !== undefined) patch.trackingCode = editingTracking[orderId];
    if (editingNotes[orderId] !== undefined) patch.adminNotes = editingNotes[orderId];
    try {
      await updateCloudOrderStatus(orderId, patch);
      onOrdersChange(orders.map((o) => (o.orderId === orderId ? { ...o, ...patch } : o)));
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
    } catch (e: any) {
      setActionError(e.message || 'No se pudo eliminar.');
    }
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
    a.download = `ventas-la-juaquina-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const waLink = (o: OrderDetails, text: string) => {
    const clean = (o.customerPhone || '').replace(/\D/g, '');
    if (!clean) return null;
    const phone = clean.startsWith('54') ? clean : '54' + clean;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-bold text-xs">{actionError}</div>
      )}
      <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
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
            <option key={s} value={s}>{s === 'todas' ? 'Todos los estados' : s}</option>
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

      {filtered.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl p-10 text-center text-xs text-[#8A7969]">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-bold text-sm text-[#3D3025]">No hay pedidos con ese filtro</p>
          <p className="mt-1">Las compras de la tienda aparecen acá con stock descontado, datos de envío y pago.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const st = o.status || 'pendiente';
            const isOpen = expanded === o.orderId;
            const msg = `¡Hola ${o.customerName}! Te escribimos de ${settings.storeName} por tu pedido ${o.orderId} (${formatARS(o.total)}). Estado: ${st}. ${o.trackingCode ? 'Código de seguimiento: ' + o.trackingCode : ''}`;
            const wa = waLink(o, msg);
            return (
              <div key={o.orderId} className="bg-[#FFFDF9] border border-[#E5D7BF] rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 flex flex-wrap items-center gap-3">
                  <div className="min-w-[180px] flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm font-black text-[#1B4E43] font-display">{o.orderId}</strong>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${STATUS_STYLE[st] || STATUS_STYLE.pendiente}`}>
                        {st}
                      </span>
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
                    onChange={(e) => handleStatus(o.orderId, e.target.value)}
                    className="text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-2.5 py-2 font-bold cursor-pointer outline-none"
                    title="Cambiar estado del pedido"
                  >
                    {STATUS.filter((s) => s !== 'todas').map((s) => (
                      <option key={s} value={s}>{s}</option>
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
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-[#25D366] text-white font-bold px-3 py-1.5 rounded-xl mt-1">
                          <Phone className="w-3.5 h-3.5" /> Avisar por WhatsApp
                        </a>
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
                      <button onClick={() => handleSaveTracking(o.orderId)} className="bg-[#1B4E43] text-white font-bold px-4 py-2 rounded-xl cursor-pointer hover:bg-[#256B5C]">
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
