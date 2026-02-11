import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LiveCountdown from '../components/LiveCountdown';
import NetworkDots from '../components/NetworkDots';
import ChatCharacters from '../components/ChatCharacters';

function formatNow(d) {
  try {
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: d.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit' }),
    };
  } catch (e) {
    return { time: '', date: '' };
  }
}

export default function LandingPage() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const nowText = useMemo(() => formatNow(now), [now]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.35),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.25),transparent_60%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        <NetworkDots className="absolute inset-0 opacity-25" />

        <div className="relative mx-auto grid min-h-screen max-w-6xl place-items-center px-4 py-10">
          <div className="w-full max-w-3xl text-center">
            <div className="mb-6 flex flex-col items-center justify-between gap-2 text-xs text-white/70 sm:flex-row">
              <div className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">Today: {nowText.date}</div>
              <div className="rounded-full bg-white/10 px-3 py-1 font-mono backdrop-blur">Live Time: {nowText.time}</div>
            </div>

            <div className="mx-auto mb-8 grid place-items-center">
              <LiveCountdown />
            </div>

            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Domain Dashboard</h1>
            <div className="mt-3 text-sm text-slate-200/80 md:text-base">
              Manage users, domains, and assignments with secure OTP auth.
            </div>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/login"
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="rounded-lg border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white"
              >
                Signup
              </Link>
            </div>

            <div className="mt-10 text-xs text-white/60">Keep this page open — countdown runs continuously.</div>

            <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <ChatCharacters />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
