import React, { useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import UsersAdminPanel from './UsersAdminPanel';
import DomainsAdminPanel from './DomainsAdminPanel';
import AssignDomainsPanel from './AssignDomainsPanel';

export default function AdminDashboard() {
  const tabs = useMemo(
    () => [
      { key: 'users', label: 'Users' },
      { key: 'domains', label: 'Domains' },
      { key: 'assign', label: 'Assign Domains' },
    ],
    []
  );
  const [tab, setTab] = useState('users');

  return (
    <Layout>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                tab === t.key
                  ? 'rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white'
                  : 'rounded-md border bg-white px-3 py-2 text-sm font-medium'
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'users' ? <UsersAdminPanel /> : null}
      {tab === 'domains' ? <DomainsAdminPanel /> : null}
      {tab === 'assign' ? <AssignDomainsPanel /> : null}
    </Layout>
  );
}
