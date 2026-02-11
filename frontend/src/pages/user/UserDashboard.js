import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import client from '../../api/client';
import toast from 'react-hot-toast';
import EmptyState from '../../components/EmptyState';
import DashboardShell, { DashboardIcons } from '../../components/DashboardShell';
import { SkeletonTable } from '../../components/Skeleton';

export default function UserDashboard() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await client.get('/domains/mine');
      setDomains(res.data);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to load domains';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <DashboardShell
        title="User"
        subtitle="Dashboard"
        items={[{ key: 'domains', label: 'My Domains', icon: DashboardIcons.domains, pageTitle: 'My Domains', pageSubtitle: 'Read-only access' }]}
        activeKey="domains"
        onChange={() => {}}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs text-slate-600 dark:text-slate-300">Assigned Domains</div>
            <div className="mt-1 text-2xl font-semibold">{loading ? '-' : domains.length}</div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs text-slate-600 dark:text-slate-300">Status</div>
            <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">Active</div>
          </div>
        </div>
        {loading ? <SkeletonTable rows={6} cols={2} /> : null}
        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-lg font-semibold">Assigned domains</div>
            <button
              type="button"
              onClick={load}
              className="rounded-md border bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              Refresh
            </button>
          </div>

          {loading ? null : null}
          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          {!loading && !error ? (
            domains.length === 0 ? (
              <EmptyState title="No Data Found !" subtitle="No domains assigned" />
            ) : (
              <div className="overflow-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                      <th className="px-2 py-2">Domain</th>
                      <th className="px-2 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domains.map((d) => (
                      <tr key={d.id} className="border-b dark:border-slate-800">
                        <td className="px-2 py-2">{d.domain_name}</td>
                        <td className="px-2 py-2">{d.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </div>
      </DashboardShell>
    </Layout>
  );
}
