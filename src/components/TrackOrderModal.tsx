import React, { useState } from 'react';
import { X, PackageSearch, Truck, CheckCircle, Circle, XCircle } from 'lucide-react';
import { OrderTracking } from '../types';
import { trackPublicOrder } from '../lib/cloudDb';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Recibido',
  pago_pendiente: 'Pago pendiente',
  confirmado: 'Confirmado',
  pagado: 'Pagado',
  preparando: 'En preparación',
  enviado: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const FLOW = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado'];

export const TrackOrderModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderTracking | null>(null);
  const [notFound, setNotFound] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setNotFound(false);
    try {
      const found = await trackPublicOrder(orderId, email);
      if (found) setResult(found);
      else setNotFound(true);
    } catch (e: any) {
      setError(e?.message || 'No se pudo consultar. Revisá los datos.');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = result ? FLOW.indexOf(result.status) : -1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-[#FFFDF9] rounded-3xl max-w-md w-full border border-[#E5D7BF] shadow-2xl p-5 sm:p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-[#F4EDE0] hover:bg-[#EFE6D3] p-2 rounded-full cursor-pointer transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-extrabold text-[#1B4E43] font-display flex items-center gap-2">
          <PackageSearch className="w-5 h-5 text-[#EFA332]" />
          Seguí tu pedido
        </h2>
        <p className="text-xs text-[#7A6A59] mt-1">
          Ingresá el número de pedido y el email de la compra.
        </p>

        <div className="mt-4 space-y-2.5">
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="N° de pedido (ej: JQ-123456)"
            className="w-full text-sm bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-[#1B4E43] font-semibold"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email de la compra"
            type="email"
            className="w-full text-sm bg-[#FAF5EC] border border-[#E3D6BE] rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-[#1B4E43]"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-[#1B4E43] hover:bg-[#256B5C] disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            {loading ? 'Buscando...' : 'Ver estado'}
          </button>
        </div>

        {error && <p className="text-xs text-[#B91C1C] font-semibold mt-3">{error}</p>}
        {notFound && (
          <p className="text-xs text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3 mt-3">
            No encontramos ese pedido con ese email. Revisá que el número (ej: JQ-123456) y el email sean los de la compra.
          </p>
        )}

        {result && (
          <div className="mt-4 bg-[#F6EFE2] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-[#1B4E43]">{result.orderId}</span>
              <span className="text-xs font-bold bg-[#1B4E43] text-white px-2.5 py-1 rounded-full">
                {STATUS_LABEL[result.status] || result.status}
              </span>
            </div>
            {result.trackingCode && (
              <p className="text-xs text-[#5A4D3F] mt-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#EFA332]" />
                Seguimiento: <strong>{result.trackingCode}</strong>
              </p>
            )}
            {result.deliveryMethod === 'correo_argentino' && result.trackingCode && (
              <a
                href={`https://www.correoargentino.com.ar/formularios/e-commerce`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#1B4E43] hover:bg-[#256B5C] px-3 py-2 rounded-xl transition-colors"
              >
                <Truck className="w-3.5 h-3.5" />
                Rastrear en Correo Argentino
              </a>
            )}
            {result.status !== 'cancelado' && stepIndex >= 0 && (
              <div className="mt-3 space-y-0">
                {FLOW.map((s, i) => (
                  <div key={s} className="flex items-start gap-2">
                    <div className="flex flex-col items-center">
                      {i < stepIndex || result.status === 'entregado' && i <= stepIndex ? (
                        <CheckCircle className="w-4 h-4 text-[#15803D]" />
                      ) : i === stepIndex ? (
                        <span className="w-4 h-4 rounded-full bg-[#EFA332] animate-pulse" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#D8CBAF]" />
                      )}
                      {i < FLOW.length - 1 && <span className="w-0.5 h-4 bg-[#E3D6BE]" />}
                    </div>
                    <span className={`text-[11px] pb-2 font-semibold ${i <= stepIndex ? 'text-[#1B4E43]' : 'text-[#A89880]'}`}>
                      {STATUS_LABEL[s]}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {result.status === 'cancelado' && (
              <p className="text-xs text-[#6B7280] mt-2 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Este pedido fue cancelado. Escribinos si necesitás ayuda.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
