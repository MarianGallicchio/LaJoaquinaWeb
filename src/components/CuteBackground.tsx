import React, { useEffect, useRef } from 'react';

// Fondo vivo y cute: laterales flotantes (solo pantallas grandes) + tira de
// fotos de mascotas en movimiento. Todo decorativo, sin bloquear clics.
const PHOTOS = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1591769225440-811ad7d6eab2?w=300&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=300&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=300&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=300&auto=format&fit=crop&q=70',
];

function Rail({ side }: { side: 'left' | 'right' }) {
  const items = side === 'left'
    ? [
        { top: '12%', el: <span className="text-4xl drop-shadow-lg">🐾</span>, delay: '0s', dur: '5s' },
        { top: '30%', el: <img src={PHOTOS[0]} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-3d" />, delay: '1s', dur: '6s' },
        { top: '48%', el: <span className="text-3xl drop-shadow-lg">🦴</span>, delay: '0.6s', dur: '5.5s' },
        { top: '64%', el: <img src={PHOTOS[1]} alt="" className="w-14 h-14 rounded-full object-cover border-4 border-white shadow-3d" />, delay: '2s', dur: '7s' },
        { top: '82%', el: <span className="text-4xl drop-shadow-lg">🐱</span>, delay: '1.4s', dur: '6s' },
      ]
    : [
        { top: '14%', el: <span className="text-4xl drop-shadow-lg">🐶</span>, delay: '0.8s', dur: '6s' },
        { top: '32%', el: <img src={PHOTOS[4]} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-3d" />, delay: '1.8s', dur: '5s' },
        { top: '50%', el: <span className="text-3xl drop-shadow-lg">🐟</span>, delay: '0.3s', dur: '6.5s' },
        { top: '66%', el: <img src={PHOTOS[5]} alt="" className="w-14 h-14 rounded-full object-cover border-4 border-white shadow-3d" />, delay: '2.4s', dur: '5.5s' },
        { top: '84%', el: <span className="text-4xl drop-shadow-lg">🐾</span>, delay: '1.1s', dur: '7s' },
      ];
  return (
    <div
      className={`hidden xl:block fixed top-0 bottom-0 w-28 z-0 pointer-events-none ${side === 'left' ? 'left-2' : 'right-2'}`}
      aria-hidden
    >
      {items.map((it, i) => (
        <div
          key={i}
          className="absolute left-1/2 -translate-x-1/2 animate-floaty opacity-80"
          style={{ top: it.top, animationDelay: it.delay, animationDuration: it.dur }}
        >
          {it.el}
        </div>
      ))}
    </div>
  );
}

export const CuteBackground: React.FC = () => (
  <>
    <Rail side="left" />
    <Rail side="right" />
  </>
);

// Huella de patita en SVG
const PawPrint: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 64 64" fill={color} className="w-full h-full">
    <ellipse cx="32" cy="40" rx="14" ry="11" />
    <circle cx="13" cy="24" r="6.5" />
    <circle cx="25" cy="13" r="6.5" />
    <circle cx="39" cy="13" r="6.5" />
    <circle cx="51" cy="24" r="6.5" />
  </svg>
);

// Fondo de patitas y formitas que se desvanece al scrollear
export const ScrollFadeBackground: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const y = window.scrollY || 0;
      el.style.opacity = Math.max(0, 1 - y / 550).toFixed(3);
      el.style.transform = `translateY(${y * 0.12}px)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const paws: { left: string; top: string; size: number; rot: number; color: string; o: number }[] = [
    { left: '4%', top: '8%', size: 56, rot: -18, color: '#1B4E43', o: 0.16 },
    { left: '12%', top: '32%', size: 34, rot: 12, color: '#EFA332', o: 0.2 },
    { left: '6%', top: '58%', size: 72, rot: 8, color: '#1B4E43', o: 0.12 },
    { left: '16%', top: '76%', size: 40, rot: -10, color: '#DE5D4E', o: 0.16 },
    { left: '26%', top: '18%', size: 30, rot: 20, color: '#EFA332', o: 0.18 },
    { left: '82%', top: '10%', size: 64, rot: 14, color: '#1B4E43', o: 0.14 },
    { left: '90%', top: '36%', size: 38, rot: -14, color: '#EFA332', o: 0.2 },
    { left: '84%', top: '60%', size: 70, rot: -8, color: '#7C3AED', o: 0.12 },
    { left: '74%', top: '80%', size: 36, rot: 16, color: '#1B4E43', o: 0.16 },
    { left: '68%', top: '22%', size: 28, rot: -20, color: '#DE5D4E', o: 0.18 },
    { left: '36%', top: '70%', size: 30, rot: 10, color: '#1B4E43', o: 0.14 },
    { left: '58%', top: '12%', size: 40, rot: -12, color: '#EFA332', o: 0.16 },
  ];

  const shapes: { left: string; top: string; size: number; rot: number; color: string; o: number; kind: 'bone' | 'ring' | 'star' }[] = [
    { left: '20%', top: '48%', size: 44, rot: -16, color: '#EFA332', o: 0.22, kind: 'bone' },
    { left: '78%', top: '46%', size: 40, rot: 12, color: '#1B4E43', o: 0.16, kind: 'bone' },
    { left: '10%', top: '88%', size: 34, rot: 0, color: '#7C3AED', o: 0.18, kind: 'ring' },
    { left: '88%', top: '88%', size: 30, rot: 0, color: '#DE5D4E', o: 0.18, kind: 'ring' },
    { left: '32%', top: '8%', size: 26, rot: 10, color: '#1B4E43', o: 0.2, kind: 'star' },
    { left: '62%', top: '86%', size: 28, rot: -10, color: '#EFA332', o: 0.2, kind: 'star' },
  ];

  return (
    <div ref={ref} className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      {/* blobs suaves */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#EFA332]/15 blur-3xl" />
      <div className="absolute top-1/3 -right-28 w-[28rem] h-[28rem] rounded-full bg-[#1B4E43]/10 blur-3xl" />
      {paws.map((p, i) => (
        <div
          key={`paw-${i}`}
          className="absolute"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size, opacity: p.o, transform: `rotate(${p.rot}deg)` }}
        >
          <PawPrint color={p.color} />
        </div>
      ))}
      {shapes.map((s, i) => (
        <div
          key={`shape-${i}`}
          className="absolute flex items-center justify-center"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.o, transform: `rotate(${s.rot}deg)` }}
        >
          {s.kind === 'bone' && <span style={{ fontSize: s.size, color: s.color, lineHeight: 1 }}>🦴</span>}
          {s.kind === 'ring' && (
            <span
              className="block rounded-full"
              style={{ width: s.size, height: s.size, border: `${Math.max(4, s.size / 7)}px solid ${s.color}` }}
            />
          )}
          {s.kind === 'star' && <span style={{ fontSize: s.size, color: s.color, lineHeight: 1 }}>★</span>}
        </div>
      ))}
    </div>
  );
};

export const PetMarquee: React.FC = () => {
  const loop = [...PHOTOS, ...PHOTOS];
  return (
    <section className="py-8 overflow-hidden" aria-hidden>
      <p className="text-center text-xs sm:text-sm font-extrabold text-[#1B4E43] font-display mb-4">
        Ellos ya disfrutan La Joaquina 🐾
      </p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#FAF7F2] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#FAF7F2] to-transparent z-10 pointer-events-none" />
        <div className="flex gap-3 w-max animate-marquee px-2">
          {loop.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-white shadow-3d shrink-0 -rotate-2 even:rotate-2"
            />
          ))}
        </div>
      </div>
    </section>
  );
};
