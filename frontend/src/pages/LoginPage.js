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
    <div className="neon-auth-bg min-h-screen">
      <div className="neon-bars">
        <div className="neon-bar" style={{ left: '8%', height: '44vh', animationDelay: '0s' }} />
        <div className="neon-bar" style={{ left: '14%', height: '32vh', animationDelay: '0.3s' }} />
        <div className="neon-bar" style={{ left: '22%', height: '56vh', animationDelay: '0.6s' }} />
        <div className="neon-bar" style={{ left: '31%', height: '38vh', animationDelay: '0.2s' }} />
        <div className="neon-bar" style={{ left: '41%', height: '62vh', animationDelay: '0.8s' }} />
        <div className="neon-bar" style={{ left: '53%', height: '36vh', animationDelay: '0.45s' }} />
        <div className="neon-bar" style={{ left: '63%', height: '58vh', animationDelay: '0.15s' }} />
        <div className="neon-bar" style={{ left: '72%', height: '40vh', animationDelay: '0.7s' }} />
        <div className="neon-bar" style={{ left: '82%', height: '52vh', animationDelay: '0.25s' }} />
        <div className="neon-bar" style={{ left: '90%', height: '30vh', animationDelay: '0.55s' }} />
      </div>
      <div className="neon-floor" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
            <div className="text-center">
              <div className="text-3xl font-semibold tracking-tight text-white">Login</div>
              <div className="mt-2 text-sm text-cyan-100/80">Welcome back. Please sign in to continue.</div>
            </div>

            <form onSubmit={onSubmit} className="mt-6">
              <label className="mb-2 block text-xs font-semibold tracking-wide text-cyan-100/80">EMAIL</label>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <input
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Enter email"
                  required
                />
              </div>

              <label className="mb-2 mt-4 block text-xs font-semibold tracking-wide text-cyan-100/80">PASSWORD</label>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <input
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Enter password"
                  required
                />
              </div>

              <div className="mt-3 flex items-center justify-end text-sm">
                <Link className="text-cyan-100/90 underline hover:text-white" to="/forgot-password">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/10 disabled:opacity-60"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <div className="mt-4 text-center text-sm text-cyan-100/80">
                Don’t have an account?{' '}
                <Link className="font-semibold text-white underline" to="/signup">
                  Signup
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
