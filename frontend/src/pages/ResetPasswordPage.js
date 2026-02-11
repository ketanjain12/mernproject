import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import client from '../api/client';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPasswordPage() {
  const q = useQuery();
  const presetEmail = q.get('email') || '';
  const presetToken = q.get('token') || '';

  const [email, setEmail] = useState(presetEmail);
  const [token, setToken] = useState(presetToken);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await client.post('/auth/reset-password/link', { email, token, newPassword });
      toast.success(res?.data?.message || 'Password updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Reset Password</h1>
      <form onSubmit={onSubmit} className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="mb-2 block text-sm font-medium">Email</label>
        <input
          className="mb-3 w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <label className="mb-2 block text-sm font-medium">Token</label>
        <input
          className="mb-3 w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
        <label className="mb-2 block text-sm font-medium">New Password</label>
        <input
          className="mb-3 w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          type="password"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>

        <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Go back to <Link className="underline" to="/login">Login</Link>
        </div>
      </form>
    </div>
  );
}
