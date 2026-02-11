import React, { useEffect, useMemo, useState } from 'react';

function pad2(n) {
  return String(n).padStart(2, '0');
}

export default function LiveCountdown({ durationSeconds = 30 * 60 * 60 }) {
  const [remaining, setRemaining] = useState(() => Number(durationSeconds) || 0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const d = Number(durationSeconds) || 0;
    setRemaining(d);
  }, [durationSeconds]);

  useEffect(() => {
    if (!remaining) return;
    const t = setInterval(() => {
      setRemaining((r) => (r <= 1 ? (Number(durationSeconds) || 0) : r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [remaining, durationSeconds]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const parts = useMemo(() => {
    const r = Math.max(0, remaining);
    const h = Math.floor(r / 3600);
    const m = Math.floor((r % 3600) / 60);
    const s = r % 60;
    return { h, m, s };
  }, [remaining]);

  const total = Math.max(1, Number(durationSeconds) || 1);
  const progress = 1 - remaining / total;
  const dashArray = 2 * Math.PI * 92;
  const dashOffset = dashArray * (1 - progress);

  return (
    <div className="relative grid place-items-center">
      <svg width="220" height="220" viewBox="0 0 220 220" className="absolute">
        <circle cx="110" cy="110" r="92" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="12" />
        <circle
          cx="110"
          cy="110"
          r="92"
          fill="none"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 110 110)"
        />
      </svg>

      <div className="relative z-10 text-center text-white">
        <div className="text-sm tracking-[0.3em] opacity-80">LIVE IN</div>
        <div className="mt-2 font-mono text-4xl font-semibold">
          {/* {pad2(parts.h)}:{pad2(parts.m)}:{pad2(parts.s)}   29:58:30 */}
          {now.toLocaleTimeString()}
        </div>
        {/* <div className="mt-2 text-[11px] tracking-[0.25em] opacity-80">LIVE TIME: {now.toLocaleTimeString()}</div> */}
        <div className="mt-2 text-xs tracking-[0.2em] opacity-80">LIVE STREAM START IN</div>
      </div>
    </div>
  );
}
