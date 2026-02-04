import React, { useEffect, useMemo, useState } from 'react';
import client from '../../api/client';

export default function AssignDomainsPanel() {
  const [users, setUsers] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selected, setSelected] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const selectedDomainIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)),
    [selected]
  );

  const load = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([client.get('/users'), client.get('/domains')]);
      setUsers(uRes.data);
      setDomains(dRes.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAssigned = async (userId) => {
    if (!userId) return;
    setError('');
    setInfo('');
    try {
      const res = await client.get(`/domains/user/${userId}`);
      const map = {};
      for (const d of res.data) map[d.id] = true;
      setSelected(map);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load assigned domains');
    }
  };

  const onPickUser = async (e) => {
    const val = e.target.value;
    setSelectedUserId(val);
    setSelected({});
    if (val) await loadAssigned(val);
  };

  const toggle = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onSave = async () => {
    if (!selectedUserId) {
      setError('Select a user');
      return;
    }
    setError('');
    setInfo('');
    setSaving(true);
    try {
      await client.post(`/domains/assign/${selectedUserId}`, { domainIds: selectedDomainIds });
      setInfo('Assigned successfully');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to assign');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="rounded-lg border bg-white p-4 shadow-sm">Loading...</div>;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 text-lg font-semibold">Assign domains to user</div>

      <label className="mb-2 block text-sm font-medium">Select user</label>
      <select className="mb-4 w-full rounded-md border px-3 py-2" value={selectedUserId} onChange={onPickUser}>
        <option value="">-- Select --</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.email})
          </option>
        ))}
      </select>

      <div className="mb-3 text-sm font-medium">Domains</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {domains.map((d) => (
          <label key={d.id} className="flex items-start gap-2 rounded-md border p-3">
            <input type="checkbox" className="mt-1" checked={!!selected[d.id]} onChange={() => toggle(d.id)} disabled={!selectedUserId} />
            <div>
              <div className="font-medium">{d.domain_name}</div>
              <div className="text-xs text-slate-600">{d.description}</div>
            </div>
          </label>
        ))}
      </div>

      {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
      {info ? <div className="mt-3 text-sm text-green-700">{info}</div> : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !selectedUserId}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Assignments'}
        </button>
      </div>
    </div>
  );
}
