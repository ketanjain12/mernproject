import React, { useMemo, useState } from 'react';

function IconUsers({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconGlobe({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
    </svg>
  );
}

function IconLink({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l1.42-1.42a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54L5.04 11.88a5 5 0 0 0 7.07 7.07l1.72-1.71" />
    </svg>
  );
}

function IconMenu({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18" />
      <path d="M3 6h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

export const DashboardIcons = {
  users: IconUsers,
  domains: IconGlobe,
  assign: IconLink,
  menu: IconMenu,
};

export default function DashboardShell({ title, subtitle, items, activeKey, onChange, children }) {
  const [open, setOpen] = useState(false);

  const activeItem = useMemo(() => items.find((i) => i.key === activeKey), [items, activeKey]);

  const onPick = (key) => {
    onChange(key);
    setOpen(false);
  };

  const Nav = ({ variant }) => (
    <div className={variant === 'mobile' ? 'p-3' : 'p-4'}>
      <div className="mb-4">
        <div className="text-base font-semibold">{title}</div>
        {subtitle ? <div className="text-xs text-slate-600 dark:text-slate-300">{subtitle}</div> : null}
      </div>
      <div className="grid gap-1">
        {items.map((i) => {
          const Icon = i.icon;
          const active = i.key === activeKey;
          return (
            <button
              key={i.key}
              type="button"
              onClick={() => onPick(i.key)}
              className={
                active
                  ? 'flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-left text-sm font-medium text-white'
                  : 'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              <span>{i.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3 md:hidden">
        <div>
          <div className="text-2xl font-semibold">{activeItem?.pageTitle || title}</div>
          {activeItem?.pageSubtitle || subtitle ? (
            <div className="text-sm text-slate-600 dark:text-slate-300">{activeItem?.pageSubtitle || subtitle}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          <IconMenu className="h-4 w-4" />
          Menu
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[80%] max-w-xs bg-white shadow-xl dark:bg-slate-900">
            <Nav variant="mobile" />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="hidden rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
          <Nav />
        </aside>

        <section>
          <div className="hidden md:block">
            <div className="mb-4">
              <h1 className="text-2xl font-semibold">{activeItem?.pageTitle || title}</h1>
              {activeItem?.pageSubtitle || subtitle ? (
                <div className="text-sm text-slate-600 dark:text-slate-300">{activeItem?.pageSubtitle || subtitle}</div>
              ) : null}
            </div>
          </div>

          {children}
        </section>
      </div>
    </div>
  );
}
