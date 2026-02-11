import React from 'react';

function Bubble({ text, side }) {
  return (
    <div
      className={
        side === 'left'
          ? 'max-w-[170px] rounded-2xl bg-white/10 px-3 py-2 text-xs text-white/90 backdrop-blur sm:max-w-[220px] sm:px-4'
          : 'max-w-[170px] rounded-2xl bg-white/15 px-3 py-2 text-xs text-white/90 backdrop-blur sm:max-w-[220px] sm:px-4'
      }
    >
      {text}
    </div>
  );
}

function Character({ variant }) {
  const isLeft = variant === 'left';
  const shirt = isLeft ? '#7c3aed' : '#2563eb';
  const accent = isLeft ? '#a78bfa' : '#60a5fa';

  return (
    <svg className="h-24 w-24 shrink-0 sm:h-[130px] sm:w-[130px]" viewBox="0 0 130 130" aria-hidden="true">
      <defs>
        <linearGradient id={`g-${variant}`} x1="0" x2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.9" />
          <stop offset="1" stopColor={shirt} stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <ellipse cx="65" cy="112" rx="40" ry="10" fill="rgba(0,0,0,0.25)" />

      <circle cx="65" cy="45" r="26" fill="#f5d0b5" />
      <path
        d="M45 46c7-10 32-12 42 0"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="55" cy="44" r="3" fill="rgba(0,0,0,0.55)" />
      <circle cx="75" cy="44" r="3" fill="rgba(0,0,0,0.55)" />
      <path d="M58 56c4 4 10 4 14 0" stroke="rgba(0,0,0,0.45)" strokeWidth="2" strokeLinecap="round" />

      <path
        d="M35 108c0-25 12-44 30-44s30 19 30 44"
        fill={`url(#g-${variant})`}
      />
      <path
        d={isLeft ? 'M38 86c-5 6-8 14-8 22' : 'M92 86c5 6 8 14 8 22'}
        stroke={`url(#g-${variant})`}
        strokeWidth="14"
        strokeLinecap="round"
      />

      <circle cx="65" cy="79" r="4" fill="rgba(255,255,255,0.65)" />
      <circle cx="65" cy="92" r="4" fill="rgba(255,255,255,0.65)" />
    </svg>
  );
}

export default function ChatCharacters() {
  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-end">
      <div className="flex flex-wrap items-end gap-3">
        <Character variant="left" />
        <div className="grid gap-2">
          <Bubble side="left" text="Hey! OTP aur audit logs ready." />
          <Bubble side="left" text="Domains assign karne ka UX bhi smooth." />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-end gap-3">
        <div className="grid gap-2 text-right">
          <Bubble side="right" text="Nice! Ab live landing page bhi premium." />
          <Bubble side="right" text="Chalo dashboard pe kaam karte hain." />
        </div>
        <Character variant="right" />
      </div>
    </div>
  );
}
