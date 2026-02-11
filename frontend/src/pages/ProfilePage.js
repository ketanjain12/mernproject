import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

function initials(nm) {
  const n = String(nm || '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || '?';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (a + b).toUpperCase();
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-3">
      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</div>
    </div>
  );
}

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
    <div className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-[28px] border bg-white/70 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/55">
        <div className="relative">
          <div className="h-44 bg-gradient-to-r from-sky-200 via-indigo-200 to-violet-200 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-[0.25]" style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(148,163,184,0.18) 2px, transparent 2px), radial-gradient(circle at 60px 60px, rgba(148,163,184,0.10) 2px, transparent 2px)', backgroundSize: '110px 110px' }} />

          <div className="relative mx-auto max-w-6xl px-4 pb-4">
            <div className="-mt-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-4">
                <div className="grid h-28 w-28 place-items-center rounded-full border bg-white text-2xl font-bold text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  {initials(name || user?.name)}
                </div>
                <div className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{name || user?.name || 'Profile'}</div>
                    {user?.role ? (
                      <span className="rounded-full border bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                        {String(user.role).toUpperCase()}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{user?.email || ''}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toast('Coming soon')}
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  Send message
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('profile-edit');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  Edit profile
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border bg-white/70 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/40">
              <div className="grid grid-cols-3 divide-x dark:divide-slate-800">
                <Stat label="Followers" value="0" />
                <Stat label="Following" value="0" />
                <Stat label="Rooms" value="0" />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 pb-6 pt-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-sm font-semibold">Professional Bio</div>
              <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                {loading ? 'Loading...' : 'Update your name and password from the right panel. More profile fields can be added later.'}
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">My core skills</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border bg-white px-3 py-1 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950">Domain Management</span>
                  <span className="rounded-full border bg-white px-3 py-1 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950">Admin Tools</span>
                  <span className="rounded-full border bg-white px-3 py-1 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950">Real-time Chat</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div id="profile-edit" className="rounded-2xl border bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-sm font-semibold">Edit Profile</div>

              {loading ? (
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Loading...</div>
              ) : (
                <>
                  <form onSubmit={onSave} className="mt-3">
                    <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">Name</label>
                    <input
                      className="mb-3 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </form>

                  <form onSubmit={onChangePassword} className="mt-5">
                    <div className="text-sm font-semibold">Change Password</div>
                    <label className="mb-2 mt-3 block text-xs font-semibold text-slate-600 dark:text-slate-300">Current Password</label>
                    <input
                      className="mb-3 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      type="password"
                    />
                    <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">New Password</label>
                    <input
                      className="mb-3 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      type="password"
                    />
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {pwLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
