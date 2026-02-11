import React, { useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import TruncateWords from '../../components/TruncateWords';
import { SkeletonCard, SkeletonTable } from '../../components/Skeleton';

export default function UsersAdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);

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

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const nameMatch = String(u.name || '').toLowerCase().includes(q);
      const emailMatch = String(u.email || '').toLowerCase().includes(q);
      return nameMatch || emailMatch;
    });
  }, [users, query]);

  const sortedUsers = useMemo(() => {
    const dir = sortDir === 'desc' ? -1 : 1;
    const arr = [...filteredUsers];
    arr.sort((a, b) => {
      const get = (u) => {
        if (sortKey === 'name') return String(u.name || '');
        if (sortKey === 'email') return String(u.email || '');
        if (sortKey === 'role') return String(u.role || '');
        return Number(u.id) || 0;
      };
      const av = get(a);
      const bv = get(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return arr;
  }, [filteredUsers, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const pagedUsers = useMemo(() => sortedUsers.slice(start, start + pageSize), [sortedUsers, start, pageSize]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const pageIds = useMemo(() => pagedUsers.map((u) => u.id), [pagedUsers]);
  const allPageSelected = useMemo(() => pageIds.length > 0 && pageIds.every((id) => !!selected[id]), [pageIds, selected]);
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)).filter(Number.isFinite),
    [selected]
  );

  const doBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkConfirmLoading(true);
    try {
      await client.post('/users/bulk-delete', { ids: selectedIds });
      toast.success('Users deleted');
      setSelected({});
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete users');
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
      const res = await client.get('/users');
      setUsers(res.data);
      setPage(1);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load users');
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
        const payload = { name, email, role };
        if (password) payload.password = password;
        await client.put(`/users/${editingId}`, payload);
        toast.success('User updated');
      } else {
        await client.post('/users', { name, email, password, role });
        toast.success('User created');
      }
      resetForm();
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || (mode === 'edit' ? 'Failed to update user' : 'Failed to create user'));
    }
  };

  const onEdit = (u) => {
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
    const u = users.find((x) => x.id === id);
    setPendingDeleteUser(u);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!pendingDeleteUser) return;
    setConfirmLoading(true);
    try {
      await client.delete(`/users/${pendingDeleteUser.id}`);
      toast.success('User deleted');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete user');
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setPendingDeleteUser(null);
    }
  };

  const onQuickRole = async (id, nextRole) => {
    try {
      await client.put(`/users/${id}`, { role: nextRole });
      toast.success('Role updated');
      await load();
      if (mode === 'edit' && editingId === id) {
        setRole(nextRole);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update user');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ConfirmModal
        open={confirmOpen}
        title="Delete?"
        message={pendingDeleteUser?.email ? `Delete user ${pendingDeleteUser.email}?` : 'Delete user?'}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={doDelete}
        onCancel={() => {
          if (confirmLoading) return;
          setConfirmOpen(false);
          setPendingDeleteUser(null);
        }}
        loading={confirmLoading}
      />
      <ConfirmModal
        open={bulkConfirmOpen}
        title="Delete?"
        message={selectedIds.length ? `Delete ${selectedIds.length} users?` : 'Delete users?'}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={doBulkDelete}
        onCancel={() => {
          if (bulkConfirmLoading) return;
          setBulkConfirmOpen(false);
        }}
        loading={bulkConfirmLoading}
      />
      {loading ? <SkeletonCard lines={10} /> : null}
      <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 text-lg font-semibold">{mode === 'edit' ? 'Edit user' : 'Create user'}</div>
        <form onSubmit={onSubmit}>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            className="mb-3 w-full rounded-md border bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            className="mb-3 w-full rounded-md border bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />

          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            className="mb-3 w-full rounded-md border bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required={mode !== 'edit'}
            placeholder={mode === 'edit' ? 'Leave blank to keep existing' : ''}
          />

          <label className="mb-1 block text-sm font-medium">Role</label>
          <select
            className="mb-3 w-full rounded-md border bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

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

      {loading ? <SkeletonTable rows={6} cols={4} /> : null}
      <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">All users</div>
          <div className="flex w-full max-w-md items-center gap-2">
            <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search by name or email" />
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
          sortedUsers.length === 0 ? (
            <EmptyState title="No Data Found !" subtitle="No users created yet" />
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
                      <button type="button" className="font-semibold" onClick={() => onSort('name')}>
                        Name
                      </button>
                    </th>
                    <th className="px-2 py-2">
                      <button type="button" className="font-semibold" onClick={() => onSort('email')}>
                        Email
                      </button>
                    </th>
                    <th className="px-2 py-2">
                      <button type="button" className="font-semibold" onClick={() => onSort('role')}>
                        Role
                      </button>
                    </th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((u) => (
                    <tr key={u.id} className="border-b dark:border-slate-800">
                      <td className="px-2 py-2">
                        <input type="checkbox" checked={!!selected[u.id]} onChange={() => toggleOne(u.id)} />
                      </td>
                      {/* <td className="px-2 py-2">{u.id}</td> */}
                      <td className="px-2 py-2">
                        <TruncateWords text={u.name} chars={4} />
                      </td>
                      <td className="px-2 py-2">{u.email}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5">{u.role}</span>
                          <button
                            type="button"
                            className="rounded border bg-white px-2 py-1 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            onClick={() => onQuickRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                          >
                            Toggle
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(u)}
                            className="rounded-md border bg-white px-2 py-1 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(u.id)}
                            className="rounded-md border bg-white px-2 py-1 text-red-700 dark:border-slate-700 dark:bg-slate-950"
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
                total={sortedUsers.length}
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
