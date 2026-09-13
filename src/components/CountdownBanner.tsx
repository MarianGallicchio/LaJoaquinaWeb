import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

interface Props {
  promoText?: string;
  promoEndsAt?: string;
}

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const Cell: React.FC<{ v: number; label: string }> = ({ v, label }) => (
  <span className="inline-flex flex-col items-center bg-black/25 rounded-lg px-1.5 py-1 min-w-[38px]">
    <span className="text-sm font-black tabular-nums leading-none">{String(v).padStart(2, '0')}</span>
    <span className="text-[9px] font-bold uppercase opacity-80">{label}</span>
  </span>
);

export const CountdownBanner: React.FC<Props> = ({ promoText, promoEndsAt }) => {
  const [now, setNow] = useState(() => Date.now());
  const end = promoEndsAt ? new Date(promoEndsAt).getTime() : NaN;

  useEffect(() => {
    if (!promoText || !Number.isFinite(end)) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [promoText, promoEndsAt]);

  if (!promoText?.trim() || !Number.isFinite(end)) return null;
  const diff = end - now;
  if (diff <= 0) return null;
  const p = parts(diff);

  return (
    <div className="bg-gradient-to-r from-[#DE5D4E] via-[#EFA332] to-[#DE5D4E] text-white text-center px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
      <span className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold font-display">
        <Timer className="w-4 h-4" />
        {promoText}
      </span>
      <span className="flex items-center gap-1">
        {p.d > 0 && <Cell v={p.d} label="días" />}
        <Cell v={p.h} label="hs" />
        <Cell v={p.m} label="min" />
        <Cell v={p.s} label="seg" />
      </span>
    </div>
  );
};
