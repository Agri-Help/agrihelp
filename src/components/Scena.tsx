/** Illustrazione: astronauti sulla luna con un campo coltivato e la Terra in cielo. */
export function Scena({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" className={className} role="img" aria-label="Astronauti sulla luna accanto a un campo coltivato">
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050a18" />
          <stop offset="1" stopColor="#13213f" />
        </linearGradient>
        <linearGradient id="suolo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9bcc4" />
          <stop offset="1" stopColor="#7d818c" />
        </linearGradient>
        <radialGradient id="terra" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#7cc4ff" />
          <stop offset="1" stopColor="#1d5fa8" />
        </radialGradient>
        <clipPath id="clipTerra"><circle cx="318" cy="58" r="26" /></clipPath>
      </defs>
      <rect width="400" height="260" fill="url(#cielo)" />
      {/* stelle */}
      {[[20,20],[60,45],[110,15],[150,60],[190,25],[240,50],[270,18],[360,110],[30,90],[90,95],[215,90],[380,30],[130,110],[300,120]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i%3===0?1.4:0.8} fill="#fff" opacity={0.6+((i*7)%4)/10} />
      ))}
      {/* Terra */}
      <circle cx="318" cy="58" r="26" fill="url(#terra)" />
      <g clipPath="url(#clipTerra)" fill="#4caf50" opacity="0.9">
        <path d="M300 45c6-6 14-4 16 2s-4 10-10 12-12-8-6-14z" />
        <path d="M322 62c5-3 12 0 13 6s-6 10-11 8-6-11-2-14z" />
      </g>
      <circle cx="318" cy="58" r="26" fill="none" stroke="#9fd3ff" strokeOpacity="0.4" strokeWidth="2" />
      {/* suolo lunare */}
      <path d="M0 150 Q100 135 200 145 T400 140 V260 H0z" fill="url(#suolo)" />
      <ellipse cx="60" cy="230" rx="28" ry="7" fill="#6d717b" opacity="0.6" />
      <ellipse cx="350" cy="215" rx="20" ry="5" fill="#6d717b" opacity="0.6" />
      <ellipse cx="330" cy="168" rx="12" ry="3" fill="#6d717b" opacity="0.5" />
      {/* campo coltivato in prospettiva */}
      <path d="M150 148 L260 146 L330 260 L60 260 Z" fill="#5b3d22" />
      {Array.from({ length: 9 }).map((_, i) => {
        const t = i / 8;
        const xTop = 156 + t * 98;
        const xBot = 72 + t * 248;
        return <path key={i} d={`M${xTop} 148 L${xBot} 260`} stroke="#6fbf3b" strokeWidth={2 + t * 0 + 3} strokeLinecap="round" strokeDasharray="1 5" />;
      })}
      {Array.from({ length: 9 }).map((_, i) => {
        const t = i / 8;
        const xTop = 156 + t * 98;
        const xBot = 72 + t * 248;
        return <path key={"f" + i} d={`M${xTop} 148 L${xBot} 260`} stroke="#8fd14f" strokeWidth="1" opacity="0.7" />;
      })}
      {/* astronauta 1 (con zappa) */}
      <g transform="translate(78 150)">
        <rect x="-10" y="6" width="20" height="26" rx="6" fill="#f2f3f5" />
        <rect x="-14" y="8" width="6" height="16" rx="3" fill="#dfe1e6" />
        <circle cx="0" cy="0" r="10" fill="#f2f3f5" />
        <rect x="-6" y="-5" width="12" height="8" rx="4" fill="#f59e0b" />
        <rect x="-8" y="30" width="7" height="14" rx="3" fill="#e6e8ec" />
        <rect x="1" y="30" width="7" height="14" rx="3" fill="#e6e8ec" />
        <path d="M10 14 L26 2" stroke="#e6e8ec" strokeWidth="5" strokeLinecap="round" />
        <path d="M24 -10 L30 40" stroke="#8b5e34" strokeWidth="2.5" />
        <path d="M24 38 l10 4 -4 -8z" fill="#9aa0a6" />
        <rect x="-4" y="12" width="8" height="5" rx="1" fill="#16a34a" />
      </g>
      {/* astronauta 2 (con tablet/GPS) */}
      <g transform="translate(355 160) scale(0.85)">
        <rect x="-10" y="6" width="20" height="26" rx="6" fill="#f2f3f5" />
        <rect x="8" y="8" width="6" height="16" rx="3" fill="#dfe1e6" />
        <circle cx="0" cy="0" r="10" fill="#f2f3f5" />
        <rect x="-6" y="-5" width="12" height="8" rx="4" fill="#f59e0b" />
        <rect x="-8" y="30" width="7" height="14" rx="3" fill="#e6e8ec" />
        <rect x="1" y="30" width="7" height="14" rx="3" fill="#e6e8ec" />
        <path d="M-10 14 L-20 16" stroke="#e6e8ec" strokeWidth="5" strokeLinecap="round" />
        <rect x="-32" y="8" width="14" height="10" rx="2" fill="#1f2937" stroke="#9aa0a6" />
        <path d="M-29 15 l4 -3 3 2 4 -4" stroke="#6fbf3b" strokeWidth="1.2" fill="none" />
        <path d="M0 -10 V-22" stroke="#9aa0a6" strokeWidth="1.5" />
        <circle cx="0" cy="-23" r="2" fill="#f59e0b" />
      </g>
      {/* satellite */}
      <g transform="translate(70 50) rotate(-20)">
        <rect x="-4" y="-4" width="8" height="8" fill="#d1d5db" />
        <rect x="-18" y="-3" width="12" height="6" fill="#2563eb" />
        <rect x="6" y="-3" width="12" height="6" fill="#2563eb" />
      </g>
      <path d="M78 58 Q120 100 150 140" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 4" fill="none" opacity="0.7" />
    </svg>
  );
}

/** Logo piccolo: casco da astronauta con germoglio. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#0b1630" />
      <path d="M8 46 Q32 38 56 46 V52 Q32 60 8 52z" fill="#a9adb6" />
      <circle cx="32" cy="28" r="16" fill="#f2f3f5" />
      <rect x="21" y="21" width="22" height="13" rx="6.5" fill="#f59e0b" />
      <path d="M32 33 V24" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 27 C27 26 26 22 27 21 C30 21 32 23 32 27z" fill="#4ade80" />
      <path d="M32 26 C37 25 38 21 37 20 C34 20 32 22 32 26z" fill="#4ade80" />
    </svg>
  );
}
