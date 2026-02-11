import React from 'react';

export function SkeletonLine({ className }) {
  return <div className={`h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className || ''}`} />;
}

export function SkeletonCard({ lines = 6 }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-3">
        {Array.from({ length: lines }).map((_, idx) => (
          <SkeletonLine key={idx} className={idx === 0 ? 'h-4 w-1/3' : ''} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 4 }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-8 w-56" />
      </div>
      <div className="grid gap-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, c) => (
              <SkeletonLine key={c} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
