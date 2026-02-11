import React from 'react';

export default function EmptyState({ title = 'No Data Found !', subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-slate-50 p-10 text-center">
      <div className="relative h-16 w-20">
        <div className="absolute inset-0 rounded-md border bg-white" />
        <div className="absolute left-2 top-2 h-2 w-2 rounded-full bg-slate-300" />
        <div className="absolute left-5 top-2 h-2 w-2 rounded-full bg-slate-300" />
        <div className="absolute left-2 top-7 h-1 w-12 rounded bg-slate-200" />
        <div className="absolute left-2 top-10 h-1 w-10 rounded bg-slate-200" />
        <div className="absolute -right-2 -bottom-2 flex h-8 w-8 items-center justify-center rounded-full border bg-white">
          <div className="h-4 w-4 rounded-full border-2 border-slate-400" />
        </div>
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-700">{title}</div>
      {subtitle ? <div className="text-sm text-slate-500">{subtitle}</div> : null}
    </div>
  );
}
