import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { name, email, password, role };
      if (role === 'admin') payload.adminKey = adminKey.trim();
      const res = await client.post('/auth/signup', payload);
      login(res.data.token, res.data.user);
      toast.success('Account created');
      if (res.data.user.role === 'admin') navigate('/admin');
      else navigate('/user');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="neon-auth-bg min-h-screen">
      <div className="neon-bars">
        <div className="neon-bar" style={{ left: '10%', height: '40vh', animationDelay: '0s' }} />
        <div className="neon-bar" style={{ left: '18%', height: '55vh', animationDelay: '0.6s' }} />
        <div className="neon-bar" style={{ left: '28%', height: '34vh', animationDelay: '0.2s' }} />
        <div className="neon-bar" style={{ left: '39%', height: '64vh', animationDelay: '0.9s' }} />
        <div className="neon-bar" style={{ left: '51%', height: '36vh', animationDelay: '0.45s' }} />
        <div className="neon-bar" style={{ left: '62%', height: '58vh', animationDelay: '0.15s' }} />
        <div className="neon-bar" style={{ left: '73%', height: '42vh', animationDelay: '0.7s' }} />
        <div className="neon-bar" style={{ left: '84%', height: '52vh', animationDelay: '0.25s' }} />
        <div className="neon-bar" style={{ left: '92%', height: '30vh', animationDelay: '0.55s' }} />
      </div>
      <div className="neon-floor" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
            <div className="text-center">
              <div className="text-3xl font-semibold tracking-tight text-white">Create Account</div>
              <div className="mt-2 text-sm text-cyan-100/80">Join us and start using the dashboard.</div>
            </div>

            <form onSubmit={onSubmit} className="mt-6">
              <label className="mb-2 block text-xs font-semibold tracking-wide text-cyan-100/80">NAME</label>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <input
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  required
                />
              </div>

              <label className="mb-2 mt-4 block text-xs font-semibold tracking-wide text-cyan-100/80">EMAIL</label>
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
                  placeholder="Create password"
                  required
                />
              </div>

              <label className="mb-2 mt-4 block text-xs font-semibold tracking-wide text-cyan-100/80">ROLE</label>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <select
                  className="w-full bg-transparent text-sm text-white outline-none"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option className="text-slate-900" value="user">
                    User
                  </option>
                  <option className="text-slate-900" value="admin">
                    Admin
                  </option>
                </select>
              </div>

              {role === 'admin' ? (
                <>
                  <label className="mb-2 mt-4 block text-xs font-semibold tracking-wide text-cyan-100/80">ADMIN KEY</label>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <input
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      type="password"
                      placeholder="Enter admin key"
                      required
                    />
                  </div>
                </>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/10 disabled:opacity-60"
              >
                {loading ? 'Creating...' : 'Signup'}
              </button>

              <div className="mt-4 text-center text-sm text-cyan-100/80">
                Already have an account?{' '}
                <Link className="font-semibold text-white underline" to="/login">
                  Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
