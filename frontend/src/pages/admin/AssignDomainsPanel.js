import React, { useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import SearchInput from '../../components/SearchInput';

export default function AssignDomainsPanel() {
  const [users, setUsers] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selected, setSelected] = useState({});
  const [domainQuery, setDomainQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedDomainIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)),
    [selected]
  );

  const filteredDomains = useMemo(() => {
    const q = domainQuery.trim().toLowerCase();
    if (!q) return domains;
    return domains.filter((d) => {
      const nameMatch = String(d.domain_name || '').toLowerCase().includes(q);
      const descMatch = String(d.description || '').toLowerCase().includes(q);
      return nameMatch || descMatch;
    });
  }, [domains, domainQuery]);

  const selectedCount = useMemo(() => selectedDomainIds.filter(Number.isFinite).length, [selectedDomainIds]);

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([client.get('/users'), client.get('/domains')]);
      setUsers(uRes.data);
      setDomains(dRes.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load');
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
    try {
      const res = await client.get(`/domains/user/${userId}`);
      const map = {};
      for (const d of res.data) map[d.id] = true;
      setSelected(map);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load assigned domains');
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

  const onSelectAllFiltered = () => {
    if (!selectedUserId) return;
    setSelected((prev) => {
      const next = { ...prev };
      for (const d of filteredDomains) next[d.id] = true;
      return next;
    });
  };

  const onClearAll = () => {
    setSelected({});
  };

  const onSave = async () => {
    if (!selectedUserId) {
      toast.error('Select a user');
      return;
    }
    setSaving(true);
    try {
      await client.post(`/domains/assign/${selectedUserId}`, { domainIds: selectedDomainIds });
      toast.success('Assigned successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to assign');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SkeletonCard lines={10} />;
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 text-lg font-semibold">Assign domains to user</div>

      {users.length === 0 ? <EmptyState title="No Data Found !" subtitle="No users available" /> : null}

      <label className="mb-2 block text-sm font-medium">Select user</label>
      <select
        className="mb-4 w-full rounded-md border bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        value={selectedUserId}
        onChange={onPickUser}
      >
        <option value="">-- Select --</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.email})
          </option>
        ))}
      </select>

      <div className="mb-3 text-sm font-medium">Domains</div>
      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
        <SearchInput value={domainQuery} onChange={setDomainQuery} placeholder="Search domains" />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSelectAllFiltered}
            disabled={!selectedUserId || filteredDomains.length === 0}
            className="rounded-md border bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={!selectedUserId || selectedCount === 0}
            className="rounded-md border bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            Clear
          </button>
        </div>
      </div>

      {selectedUserId ? (
        <div className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Selected: <span className="font-medium text-slate-900 dark:text-slate-100">{selectedCount}</span>
        </div>
      ) : null}

      {selectedUserId && selectedCount ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {domains
            .filter((d) => !!selected[d.id])
            .slice(0, 12)
            .map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggle(d.id)}
                className="rounded-full border bg-white px-3 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                title={d.domain_name}
              >
                {String(d.domain_name || '').slice(0, 18)}
              </button>
            ))}
          {selectedCount > 12 ? (
            <div className="rounded-full border bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
              +{selectedCount - 12} more
            </div>
          ) : null}
        </div>
      ) : null}

      {domains.length === 0 ? (
        <EmptyState title="No Data Found !" subtitle="No domains available" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filteredDomains.map((d) => (
            <label key={d.id} className="flex items-start gap-2 rounded-md border p-3 dark:border-slate-800">
              <input type="checkbox" className="mt-1" checked={!!selected[d.id]} onChange={() => toggle(d.id)} disabled={!selectedUserId} />
              <div>
                <div className="font-medium">{d.domain_name}</div>
                <div className="text-xs text-slate-600 dark:text-slate-300">{d.description}</div>
              </div>
            </label>
          ))}
        </div>
      )}

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
