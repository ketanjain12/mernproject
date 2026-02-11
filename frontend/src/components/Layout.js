import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="border-b bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <Link to={user?.role === 'admin' ? '/admin' : '/user'} className="font-semibold">
            Domain Dashboard
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md border bg-white px-3 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-950 sm:text-sm"
            >
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
            {user ? (
              <>
                <Link
                  to="/chat"
                  className="rounded-md border bg-white px-3 py-1.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:text-sm"
                >
                  Chat
                </Link>
                <Link
                  to="/profile"
                  className="rounded-md border bg-white px-3 py-1.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:text-sm"
                >
                  Profile
                </Link>
                <div className="hidden text-sm text-slate-600 dark:text-slate-300 sm:block">
                  {user.name} ({user.role})
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white sm:text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-3 text-sm">
                <Link className="text-slate-700 underline dark:text-slate-200" to="/login">
                  Login
                </Link>
                <Link className="text-slate-700 underline dark:text-slate-200" to="/signup">
                  Signup
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">{children}</main>
    </div>
  );
}
