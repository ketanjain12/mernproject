import React, { useEffect, useState } from 'react';
import client from '../../api/client';

export default function DomainsAdminPanel() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);

  const [domainName, setDomainName] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setMode('create');
    setEditingId(null);
    setDomainName('');
    setDescription('');
  };

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await client.get('/domains');
      setDomains(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load domains');
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
        await client.put(`/domains/${editingId}`, { domain_name: domainName, description });
      } else {
        await client.post('/domains', { domain_name: domainName, description });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || (mode === 'edit' ? 'Failed to update domain' : 'Failed to create domain'));
    }
  };

  const onEdit = (d) => {
    setError('');
    setMode('edit');
    setEditingId(d.id);
    setDomainName(d.domain_name || '');
    setDescription(d.description || '');
  };

  const onCancelEdit = () => {
    resetForm();
  };

  const onDelete = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete domain?')) return;
    setError('');
    try {
      await client.delete(`/domains/${id}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete domain');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 text-lg font-semibold">{mode === 'edit' ? 'Edit domain' : 'Create domain'}</div>
        <form onSubmit={onSubmit}>
          <label className="mb-1 block text-sm font-medium">Domain Name</label>
          <input
            className="mb-3 w-full rounded-md border px-3 py-2"
            value={domainName}
            onChange={(e) => setDomainName(e.target.value)}
            placeholder="example.com"
            required
          />
          <label className="mb-1 block text-sm font-medium">Description</label>
          <input className="mb-3 w-full rounded-md border px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />

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
          <div className="text-lg font-semibold">All domains</div>
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
                  <th className="px-2 py-2">Domain</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="px-2 py-2">{d.id}</td>
                    <td className="px-2 py-2">{d.domain_name}</td>
                    <td className="px-2 py-2">{d.description}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button type="button" className="rounded-md border px-2 py-1" onClick={() => onEdit(d)}>
                          Edit
                        </button>
                        <button type="button" className="rounded-md border px-2 py-1 text-red-700" onClick={() => onDelete(d.id)}>
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
