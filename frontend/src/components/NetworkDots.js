import React, { useEffect, useMemo, useRef, useState } from 'react';

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function NetworkDots({
  count = 70,
  width = 900,
  height = 520,
  maxDist = 130,
  seed = 1337,
  className,
}) {
  const rng = useMemo(() => mulberry32(seed), [seed]);

  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < count; i += 1) {
      pts.push({
        x: Math.floor(rng() * width),
        y: Math.floor(rng() * height),
        r: 1.2 + rng() * 2.2,
      });
    }
    return pts;
  }, [count, height, rng, width]);

  const [phase, setPhase] = useState(0);
  const lastPaintRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    const loop = (t) => {
      if (!lastPaintRef.current) lastPaintRef.current = t;
      const dt = t - lastPaintRef.current;
      if (dt >= 33) {
        lastPaintRef.current = t;
        setPhase(t / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const drifted = useMemo(() => {
    return points.map((p, idx) => {
      const dx = Math.sin((idx + 1) * 1.7 + phase) * 6;
      const dy = Math.cos((idx + 1) * 1.1 + phase) * 6;
      return { ...p, x: p.x + dx, y: p.y + dy };
    });
  }, [points, phase]);

  const lines = useMemo(() => {
    const out = [];
    for (let i = 0; i < drifted.length; i += 1) {
      for (let j = i + 1; j < drifted.length; j += 1) {
        const a = drifted[i];
        const b = drifted[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= maxDist) {
          const alpha = 0.22 * (1 - d / maxDist);
          out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, alpha });
        }
      }
    }
    return out;
  }, [drifted, maxDist]);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g>
        {lines.map((l, idx) => (
          <line
            key={idx}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={`rgba(255,255,255,${l.alpha})`}
            strokeWidth="1"
          />
        ))}
      </g>
      <g>
        {drifted.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r={p.r} fill="rgba(255,255,255,0.70)" />
        ))}
      </g>
    </svg>
  );
}
