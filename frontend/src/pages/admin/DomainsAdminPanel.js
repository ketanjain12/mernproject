import React, { useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import { SkeletonCard, SkeletonTable } from '../../components/Skeleton';

export default function DomainsAdminPanel() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingDeleteDomain, setPendingDeleteDomain] = useState(null);

  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkConfirmLoading, setBulkConfirmLoading] = useState(false);

  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selected, setSelected] = useState({});
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('asc');

  const [domainName, setDomainName] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setMode('create');
    setEditingId(null);
    setDomainName('');
    setDescription('');
  };

  const filteredDomains = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return domains;
    return domains.filter((d) => {
      const nameMatch = String(d.domain_name || '').toLowerCase().includes(q);
      const descMatch = String(d.description || '').toLowerCase().includes(q);
      return nameMatch || descMatch;
    });
  }, [domains, query]);

  const sortedDomains = useMemo(() => {
    const dir = sortDir === 'desc' ? -1 : 1;
    const arr = [...filteredDomains];
    arr.sort((a, b) => {
      const get = (d) => {
        if (sortKey === 'domain_name') return String(d.domain_name || '');
        if (sortKey === 'description') return String(d.description || '');
        return Number(d.id) || 0;
      };
      const av = get(a);
      const bv = get(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return arr;
  }, [filteredDomains, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sortedDomains.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const pagedDomains = useMemo(() => sortedDomains.slice(start, start + pageSize), [sortedDomains, start, pageSize]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const pageIds = useMemo(() => pagedDomains.map((d) => d.id), [pagedDomains]);
  const allPageSelected = useMemo(() => pageIds.length > 0 && pageIds.every((id) => !!selected[id]), [pageIds, selected]);
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)).filter(Number.isFinite),
    [selected]
  );

  const doBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkConfirmLoading(true);
    try {
      await client.post('/domains/bulk-delete', { ids: selectedIds });
      toast.success('Domains deleted');
      setSelected({});
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete domains');
    } finally {
      setBulkConfirmLoading(false);
      setBulkConfirmOpen(false);
    }
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of pageIds) next[id] = !allPageSelected;
      return next;
    });
  };

  const toggleOne = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get('/domains');
      setDomains(res.data);
      setPage(1);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load domains');
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
    try {
      if (mode === 'edit') {
        await client.put(`/domains/${editingId}`, { domain_name: domainName, description });
        toast.success('Domain updated');
      } else {
        await client.post('/domains', { domain_name: domainName, description });
        toast.success('Domain created');
      }
      resetForm();
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || (mode === 'edit' ? 'Failed to update domain' : 'Failed to create domain'));
    }
  };

  const onEdit = (d) => {
    setMode('edit');
    setEditingId(d.id);
    setDomainName(d.domain_name || '');
    setDescription(d.description || '');
  };

  const onCancelEdit = () => {
    resetForm();
  };

  const onDelete = async (id) => {
    const d = domains.find((x) => x.id === id);
    setPendingDeleteDomain(d);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!pendingDeleteDomain) return;
    setConfirmLoading(true);
    try {
      await client.delete(`/domains/${pendingDeleteDomain.id}`);
      toast.success('Domain deleted');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete domain');
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setPendingDeleteDomain(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ConfirmModal
        open={confirmOpen}
        title="Delete?"
        message={pendingDeleteDomain?.domain_name ? `Delete domain ${pendingDeleteDomain.domain_name}?` : 'Delete domain?'}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={doDelete}
        onCancel={() => {
          if (confirmLoading) return;
          setConfirmOpen(false);
          setPendingDeleteDomain(null);
        }}
        loading={confirmLoading}
      />
      <ConfirmModal
        open={bulkConfirmOpen}
        title="Delete?"
        message={selectedIds.length ? `Delete ${selectedIds.length} domains?` : 'Delete domains?'}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={doBulkDelete}
        onCancel={() => {
          if (bulkConfirmLoading) return;
          setBulkConfirmOpen(false);
        }}
        loading={bulkConfirmLoading}
      />
      {loading ? <SkeletonCard lines={8} /> : null}
      <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 text-lg font-semibold">{mode === 'edit' ? 'Edit domain' : 'Create domain'}</div>
        <form onSubmit={onSubmit}>
          <label className="mb-1 block text-sm font-medium">Domain Name</label>
          <input
            className="mb-3 w-full rounded-md border bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            value={domainName}
            onChange={(e) => setDomainName(e.target.value)}
            placeholder="example.com"
            required
          />
          <label className="mb-1 block text-sm font-medium">Description</label>
          <input
            className="mb-3 w-full rounded-md border bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              {mode === 'edit' ? 'Update' : 'Create'}
            </button>
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-md border bg-white px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-950"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {loading ? <SkeletonTable rows={6} cols={3} /> : null}
      <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">All domains</div>
          <div className="flex w-full max-w-md items-center gap-2">
            <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search domains" />
            <button
              type="button"
              onClick={load}
              className="shrink-0 rounded-md border bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              Refresh
            </button>
          </div>
        </div>

        {selectedIds.length ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-800">
            <div className="text-slate-700 dark:text-slate-200">
              Selected: <span className="font-medium">{selectedIds.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                onClick={() => setSelected({})}
              >
                Clear
              </button>
              <button
                type="button"
                className="rounded-md border bg-white px-3 py-1.5 text-sm text-red-700 dark:border-slate-700 dark:bg-slate-950"
                onClick={() => setBulkConfirmOpen(true)}
              >
                Delete Selected
              </button>
            </div>
          </div>
        ) : null}

        {loading ? null : null}
        {!loading ? (
          sortedDomains.length === 0 ? (
            <EmptyState title="No Data Found !" subtitle="No domains created yet" />
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                    <th className="px-2 py-2">
                      <input type="checkbox" checked={allPageSelected} onChange={toggleAllOnPage} />
                    </th>
                    {/* <th className="px-2 py-2">ID</th> */}
                    <th className="px-2 py-2">
                      <button type="button" className="font-semibold" onClick={() => onSort('domain_name')}>
                        Domain
                      </button>
                    </th>
                    <th className="px-2 py-2">
                      <button type="button" className="font-semibold" onClick={() => onSort('description')}>
                        Description
                      </button>
                    </th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDomains.map((d) => (
                    <tr key={d.id} className="border-b dark:border-slate-800">
                      <td className="px-2 py-2">
                        <input type="checkbox" checked={!!selected[d.id]} onChange={() => toggleOne(d.id)} />
                      </td>
                      {/* <td className="px-2 py-2">{d.id}</td> */}
                      <td className="px-2 py-2">{d.domain_name}</td>
                      <td className="px-2 py-2">{d.description}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-md border bg-white px-2 py-1 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            onClick={() => onEdit(d)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-md border bg-white px-2 py-1 text-red-700 dark:border-slate-700 dark:bg-slate-950"
                            onClick={() => onDelete(d.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Pagination
                page={page}
                pageSize={pageSize}
                total={sortedDomains.length}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
              />
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
