import React from 'react';

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="text-slate-600 dark:text-slate-300">
        Page <span className="font-medium text-slate-900 dark:text-slate-100">{safePage}</span> of{' '}
        <span className="font-medium text-slate-900 dark:text-slate-100">{totalPages}</span> ({total || 0} items)
      </div>

      <div className="flex items-center gap-2">
        <select
          className="rounded-md border bg-white px-2 py-1 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>

        <button
          type="button"
          className="rounded-md border bg-white px-3 py-1.5 text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          onClick={() => onPageChange(safePage - 1)}
          disabled={!canPrev}
        >
          Prev
        </button>
        <button
          type="button"
          className="rounded-md border bg-white px-3 py-1.5 text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          onClick={() => onPageChange(safePage + 1)}
          disabled={!canNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
