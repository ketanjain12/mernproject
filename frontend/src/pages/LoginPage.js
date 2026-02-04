import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
      if (res.data.user.role === 'admin') navigate('/admin');
      else navigate('/user');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>
      <form onSubmit={onSubmit} className="rounded-lg border bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium">Email</label>
        <input
          className="mb-3 w-full rounded-md border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <label className="mb-2 block text-sm font-medium">Password</label>
        <input
          className="mb-3 w-full rounded-md border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />
        {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <div className="mt-3 text-sm text-slate-600">
          Don’t have an account? <Link className="underline" to="/signup">Signup</Link>
        </div>
      </form>
    </div>
  );
}
