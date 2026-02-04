import React, { useEffect, useState } from 'react';
import client from '../../api/client';

export default function UsersAdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');

  const resetForm = () => {
    setMode('create');
    setEditingId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('user');
  };

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await client.get('/users');
      setUsers(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'edit') {
        const payload = { name, email, role };
        if (password) payload.password = password;
        await client.put(`/users/${editingId}`, payload);
      } else {
        await client.post('/users', { name, email, password, role });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || (mode === 'edit' ? 'Failed to update user' : 'Failed to create user'));
    }
  };

  const onEdit = (u) => {
    setError('');
    setMode('edit');
    setEditingId(u.id);
    setName(u.name || '');
    setEmail(u.email || '');
    setRole(u.role || 'user');
    setPassword('');
  };

  const onCancelEdit = () => {
    resetForm();
  };

  const onDelete = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete user?')) return;
    setError('');
    try {
      await client.delete(`/users/${id}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete user');
    }
  };

  const onQuickRole = async (id, nextRole) => {
    setError('');
    try {
      await client.put(`/users/${id}`, { role: nextRole });
      await load();
      if (mode === 'edit' && editingId === id) {
        setRole(nextRole);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update user');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 text-lg font-semibold">{mode === 'edit' ? 'Edit user' : 'Create user'}</div>
        <form onSubmit={onSubmit}>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input className="mb-3 w-full rounded-md border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />

          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            className="mb-3 w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />

          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            className="mb-3 w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required={mode !== 'edit'}
            placeholder={mode === 'edit' ? 'Leave blank to keep existing' : ''}
          />

          <label className="mb-1 block text-sm font-medium">Role</label>
          <select className="mb-3 w-full rounded-md border px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}

          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              {mode === 'edit' ? 'Update' : 'Create'}
            </button>
            {mode === 'edit' ? (
              <button type="button" onClick={onCancelEdit} className="rounded-md border bg-white px-3 py-2 text-sm font-medium">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">All users</div>
          <button type="button" onClick={load} className="rounded-md border bg-white px-3 py-1.5 text-sm">
            Refresh
          </button>
        </div>

        {loading ? <div className="text-sm text-slate-600">Loading...</div> : null}
        {!loading ? (
          <div className="overflow-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Role</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="px-2 py-2">{u.id}</td>
                    <td className="px-2 py-2">{u.name}</td>
                    <td className="px-2 py-2">{u.email}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-2 py-0.5">{u.role}</span>
                        <button
                          type="button"
                          className="rounded border bg-white px-2 py-1"
                          onClick={() => onQuickRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                        >
                          Toggle
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => onEdit(u)} className="rounded-md border px-2 py-1">
                          Edit
                        </button>
                        <button type="button" onClick={() => onDelete(u.id)} className="rounded-md border px-2 py-1 text-red-700">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
