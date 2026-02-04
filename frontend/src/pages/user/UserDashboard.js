import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import client from '../../api/client';

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
      setError(err?.response?.data?.message || 'Failed to load domains');
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
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">My Domains</h1>
        <div className="text-sm text-slate-600">Read-only access</div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Assigned domains</div>
          <button type="button" onClick={load} className="rounded-md border bg-white px-3 py-1.5 text-sm">
            Refresh
          </button>
        </div>

        {loading ? <div className="text-sm text-slate-600">Loading...</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {!loading && !error ? (
          domains.length === 0 ? (
            <div className="text-sm text-slate-600">No domains assigned</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-2 py-2">Domain</th>
                    <th className="px-2 py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((d) => (
                    <tr key={d.id} className="border-b">
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
    </Layout>
  );
}
