import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get('/me');
      setName(res.data.name || '');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await client.put('/me', { name });
      login(localStorage.getItem('token'), res.data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return toast.error('Fill all fields');
    setPwLoading(true);
    try {
      const res = await client.post('/me/change-password', { currentPassword, newPassword });
      toast.success(res?.data?.message || 'Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-semibold">Profile</h1>

      <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">Loading...</div>
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              Signed in as <span className="font-medium text-slate-900 dark:text-slate-100">{user?.email}</span>
            </div>

            <form onSubmit={onSave}>
              <label className="mb-2 block text-sm font-medium">Name</label>
              <input
                className="mb-3 w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>

            <form onSubmit={onChangePassword} className="mt-6">
              <div className="text-sm font-semibold">Change Password</div>
              <label className="mb-2 mt-3 block text-sm font-medium">Current Password</label>
              <input
                className="mb-3 w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                type="password"
              />
              <label className="mb-2 block text-sm font-medium">New Password</label>
              <input
                className="mb-3 w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
              />
              <button
                type="submit"
                disabled={pwLoading}
                className="w-full rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
