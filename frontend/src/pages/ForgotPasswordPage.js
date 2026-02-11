import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import client from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loadingLink, setLoadingLink] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingResetOtp, setLoadingResetOtp] = useState(false);

  const onSendLink = async () => {
    if (!email) return toast.error('Enter email');
    setLoadingLink(true);
    try {
      const res = await client.post('/auth/forgot-password/link', { email });
      toast.success(res?.data?.message || 'Reset link sent');
      if (res?.data?.resetUrl) toast.success(`DEV URL: ${res.data.resetUrl}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    } finally {
      setLoadingLink(false);
    }
  };

  const onSendOtp = async () => {
    if (!email) return toast.error('Enter email');
    setLoadingOtp(true);
    try {
      const res = await client.post('/auth/forgot-password/otp', { email });
      toast.success(res?.data?.message || 'OTP sent');
      if (res?.data?.otp) toast.success(`DEV OTP: ${res.data.otp}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    } finally {
      setLoadingOtp(false);
    }
  };

  const onResetWithOtp = async (e) => {
    e.preventDefault();
    if (!email || !otp || !newPassword) return toast.error('Fill all fields');
    setLoadingResetOtp(true);
    try {
      const res = await client.post('/auth/reset-password/otp', { email, otp, newPassword });
      toast.success(res?.data?.message || 'Password updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    } finally {
      setLoadingResetOtp(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Forgot Password</h1>
      <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="mb-2 block text-sm font-medium">Email</label>
        <input
          className="mb-3 w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onSendLink}
            disabled={loadingLink}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loadingLink ? 'Sending...' : 'Send Reset Link'}
          </button>
          <button
            type="button"
            onClick={onSendOtp}
            disabled={loadingOtp}
            className="rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {loadingOtp ? 'Sending...' : 'Send OTP'}
          </button>
        </div>

        <form onSubmit={onResetWithOtp} className="mt-6">
          <div className="text-sm font-semibold">Reset using OTP</div>
          <label className="mb-2 mt-3 block text-sm font-medium">OTP</label>
          <input
            className="mb-3 w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputMode="numeric"
            required
          />
          <label className="mb-2 block text-sm font-medium">New Password</label>
          <input
            className="mb-3 w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            required
          />
          <button
            type="submit"
            disabled={loadingResetOtp}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loadingResetOtp ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Go back to <Link className="underline" to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
