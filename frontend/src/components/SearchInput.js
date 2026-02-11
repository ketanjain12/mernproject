import React from 'react';

export default function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      className="w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Search...'}
    />
  );
}
