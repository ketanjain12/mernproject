import React from 'react';

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  loading,
}) {
  if (!open) return null;

  const confirmClass =
    confirmVariant === 'danger'
      ? 'text-red-600 hover:bg-red-50'
      : 'text-slate-900 hover:bg-slate-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        disabled={loading}
      />

      <div className="relative w-[92%] max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="text-2xl font-semibold">{title || 'Delete?'}</div>
          {message ? <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">Really Do You want to {message}</div> : null}
        </div>

        <div className="grid grid-cols-2 border-t dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-4 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-60 dark:hover:bg-slate-800"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-4 text-center text-sm font-medium ${confirmClass} disabled:opacity-60 dark:hover:bg-slate-800`}
          >
            {loading ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
