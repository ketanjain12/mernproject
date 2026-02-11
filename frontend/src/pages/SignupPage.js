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
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Create account</h1>
      <form onSubmit={onSubmit} className="rounded-lg border bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium">Name</label>
        <input
          className="mb-3 w-full rounded-md border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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

        <label className="mb-2 block text-sm font-medium">Role</label>
        <select
          className="mb-3 w-full rounded-md border px-3 py-2"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        {role === 'admin' ? (
          <>
            <label className="mb-2 block text-sm font-medium">Admin Key</label>
            <input
              className="mb-3 w-full rounded-md border px-3 py-2"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              type="password"
              required
            />
          </>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Creating...' : 'Signup'}
        </button>

        <div className="mt-3 text-sm text-slate-600">
          Already have an account? <Link className="underline" to="/login">Login</Link>
        </div>
      </form>
    </div>
  );
}
