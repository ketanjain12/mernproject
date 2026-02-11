import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await client.post('/auth/login', { email, password });
      if (res.data.otpRequired) {
        sessionStorage.setItem('otpToken', res.data.otpToken);
        sessionStorage.setItem('otpUser', JSON.stringify(res.data.user));
        toast.success(res.data.message || 'OTP sent');
        if (res.data.otp) {
          toast.success(`OTP: ${res.data.otp}`);
        }
        navigate('/verify-otp');
        return;
      }

      login(res.data.token, res.data.user);
      toast.success('Login successful');
      if (res.data.user.role === 'admin') navigate('/admin');
      else navigate('/user');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>
      <form onSubmit={onSubmit} className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="mb-2 block text-sm font-medium">Email</label>
        <input
          className="mb-3 w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <label className="mb-2 block text-sm font-medium">Password</label>
        <input
          className="mb-3 w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />

        <div className="mb-3 text-right text-sm">
          <Link className="underline text-slate-700 dark:text-slate-200" to="/forgot-password">Forgot password?</Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Don’t have an account? <Link className="underline" to="/signup">Signup</Link>
        </div>
      </form>
    </div>
  );
}
