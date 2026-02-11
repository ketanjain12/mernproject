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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to={user?.role === 'admin' ? '/admin' : '/user'} className="font-semibold">
            Domain Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-950"
            >
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  Profile
                </Link>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {user.name} ({user.role})
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
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
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
