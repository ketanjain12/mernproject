import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import DashboardShell, { DashboardIcons } from '../../components/DashboardShell';
import UsersAdminPanel from './UsersAdminPanel';
import DomainsAdminPanel from './DomainsAdminPanel';
import AssignDomainsPanel from './AssignDomainsPanel';
import AuditLogsPanel from './AuditLogsPanel';
import client from '../../api/client';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const items = useMemo(
    () => [
      { key: 'users', label: 'Users', icon: DashboardIcons.users, pageTitle: 'Admin Dashboard', pageSubtitle: 'Manage users' },
      { key: 'domains', label: 'Domains', icon: DashboardIcons.domains, pageTitle: 'Admin Dashboard', pageSubtitle: 'Manage domains' },
      { key: 'assign', label: 'Assign Domains', icon: DashboardIcons.assign, pageTitle: 'Admin Dashboard', pageSubtitle: 'Assign domains to users' },
      { key: 'audit', label: 'Audit Logs', icon: DashboardIcons.assign, pageTitle: 'Admin Dashboard', pageSubtitle: 'Track activity' },
    ],
    []
  );
  const [tab, setTab] = useState('users');
  const [stats, setStats] = useState({ users: 0, domains: 0, assignments: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await client.get('/stats');
        setStats(res.data);
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to load stats');
      }
    };
    load();
  }, []);

  return (
    <Layout>
      <DashboardShell title="Admin" subtitle="Dashboard" items={items} activeKey={tab} onChange={setTab}>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs text-slate-600 dark:text-slate-300">Users</div>
            <div className="mt-1 text-2xl font-semibold">{stats.users}</div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs text-slate-600 dark:text-slate-300">Domains</div>
            <div className="mt-1 text-2xl font-semibold">{stats.domains}</div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs text-slate-600 dark:text-slate-300">Assignments</div>
            <div className="mt-1 text-2xl font-semibold">{stats.assignments}</div>
          </div>
        </div>
        {tab === 'users' ? <UsersAdminPanel /> : null}
        {tab === 'domains' ? <DomainsAdminPanel /> : null}
        {tab === 'assign' ? <AssignDomainsPanel /> : null}
        {tab === 'audit' ? <AuditLogsPanel /> : null}
      </DashboardShell>
    </Layout>
  );
}
