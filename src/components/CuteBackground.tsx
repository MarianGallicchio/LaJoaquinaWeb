import React from 'react';

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
