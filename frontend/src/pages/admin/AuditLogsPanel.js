import React, { useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { SkeletonTable } from '../../components/Skeleton';

export default function AuditLogsPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const load = async ({ nextPage, nextPageSize, nextQuery } = {}) => {
    const p = nextPage || page;
    const ps = nextPageSize || pageSize;
    const q = typeof nextQuery === 'string' ? nextQuery : query;

    setLoading(true);
    try {
      const res = await client.get('/audit', { params: { page: p, pageSize: ps, q } });
      setRows(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const onSearch = (v) => {
    setQuery(v);
    setPage(1);
    load({ nextPage: 1, nextQuery: v });
  };

  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-lg font-semibold">Audit Logs</div>
        <div className="flex w-full max-w-md items-center gap-2">
          <SearchInput value={query} onChange={onSearch} placeholder="Search action/entity/email" />
          <button
            type="button"
            onClick={() => load({ nextPage: page })}
            className="shrink-0 rounded-md border bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? <SkeletonTable rows={8} cols={5} /> : null}

      {!loading ? (
        safeRows.length === 0 ? (
          <EmptyState title="No Data Found !" subtitle="No audit events yet" />
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Action</th>
                  <th className="px-2 py-2">Actor</th>
                  <th className="px-2 py-2">Entity</th>
                  <th className="px-2 py-2">Meta</th>
                </tr>
              </thead>
              <tbody>
                {safeRows.map((r) => (
                  <tr key={r.id} className="border-b dark:border-slate-800">
                    <td className="px-2 py-2 whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{r.action}</td>
                    <td className="px-2 py-2">
                      <div className="text-slate-900 dark:text-slate-100">{r.actor_email || '-'}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">{r.actor_role || ''}</div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {(r.entity_type || '-') + (r.entity_id ? `:${r.entity_id}` : '')}
                    </td>
                    <td className="px-2 py-2">
                      <div className="max-w-md truncate text-xs text-slate-600 dark:text-slate-300" title={r.meta ? JSON.stringify(r.meta) : ''}>
                        {r.meta ? JSON.stringify(r.meta) : ''}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
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
  );
}
