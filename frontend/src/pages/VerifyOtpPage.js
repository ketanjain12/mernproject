import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

function splitToDigits(value) {
  const clean = String(value || '').replace(/\D/g, '').slice(0, 6);
  const arr = clean.split('');
  while (arr.length < 6) arr.push('');
  return arr;
}

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [otpToken, setOtpToken] = useState(() => sessionStorage.getItem('otpToken'));
  const otpUser = useMemo(() => {
    const raw = sessionStorage.getItem('otpUser');
    return raw ? JSON.parse(raw) : null;
  }, []);

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!otpToken) {
      navigate('/login', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpToken]);

  const setAt = (idx, val) => {
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const onChange = (idx, e) => {
    const v = e.target.value;

    if (v.length > 1) {
      const next = splitToDigits(v);
      setDigits(next);
      const lastIndex = Math.min(5, next.findIndex((x) => x === '') === -1 ? 5 : next.findIndex((x) => x === '') - 1);
      inputRefs.current[lastIndex]?.focus();
      return;
    }

    const digit = v.replace(/\D/g, '').slice(0, 1);
    setAt(idx, digit);
    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const onKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const onPaste = (e) => {
    const text = e.clipboardData.getData('text');
    const next = splitToDigits(text);
    setDigits(next);
    const lastIndex = Math.min(5, next.findIndex((x) => x === '') === -1 ? 5 : next.findIndex((x) => x === '') - 1);
    inputRefs.current[lastIndex]?.focus();
    e.preventDefault();
  };

  const otp = digits.join('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (loading) return;
    if (!otpToken) return;
    if (digits.some((d) => !d)) return;
    if (otp.length !== 6) return;
    const fakeEvent = { preventDefault: () => {} };
    onVerify(fakeEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const onVerify = async (e) => {
    e.preventDefault();
    if (digits.some((d) => !d) || otp.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await client.post('/auth/verify-otp', { otpToken, otp });
      login(res.data.token, res.data.user);
      toast.success('Verified successfully');
      sessionStorage.removeItem('otpToken');
      sessionStorage.removeItem('otpUser');
      if (res.data.user.role === 'admin') navigate('/admin');
      else navigate('/user');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const onCancel = () => {
    sessionStorage.removeItem('otpToken');
    sessionStorage.removeItem('otpUser');
    navigate('/login');
  };

  const onResend = async () => {
    if (!otpToken) return;
    if (cooldown > 0) return;
    setResendLoading(true);
    try {
      const res = await client.post('/auth/resend-otp', { otpToken });
      toast.success(res?.data?.message || 'OTP resent');
      if (res?.data?.otpToken) {
        sessionStorage.setItem('otpToken', res.data.otpToken);
        setOtpToken(res.data.otpToken);
      }
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
      setCooldown(30);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to resend OTP';
      toast.error(msg);
      if (err?.response?.status === 429) {
        const h = err?.response?.headers || {};
        const retryAfterHeader = Number(h['retry-after']);
        const retryAfterBody = Number(err?.response?.data?.retryAfter);
        const seconds = Number.isFinite(retryAfterHeader)
          ? retryAfterHeader
          : Number.isFinite(retryAfterBody)
            ? retryAfterBody
            : 30;
        setCooldown(Math.max(1, seconds));
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-2xl font-semibold">Please Verify Account</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Enter the 6 digit code we sent to your email address{otpUser?.email ? ` (${otpUser.email})` : ''}.
        </div>

        <form onSubmit={onVerify} className="mt-5">
          <div className="flex justify-center gap-2" onPaste={onPaste}>
            {digits.map((d, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                value={d}
                onChange={(e) => onChange(idx, e)}
                onKeyDown={(e) => onKeyDown(idx, e)}
                inputMode="numeric"
                className="h-12 w-11 rounded-lg border bg-white text-center text-lg font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                maxLength={1}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onResend}
            disabled={loading || resendLoading || cooldown > 0}
            className="mt-4 w-full rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : resendLoading ? 'Resending...' : 'Resend OTP'}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="mt-3 w-full rounded-md border bg-white px-3 py-2 text-sm font-medium disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
          >
            Cancel
          </button>

          <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Go back to <Link className="underline" to="/login">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
