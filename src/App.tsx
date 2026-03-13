import React, { useState, useEffect } from 'react';
import EstimatorForm from './components/EstimatorForm';
import AdminDashboard from './components/AdminDashboard';
import SuperAdmin from './components/SuperAdmin';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import VerifyEmailForm from './components/VerifyEmailForm';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const { user, loading, refetch } = useAuth();
  const [masterPassword, setMasterPassword] = useState('');
  const [masterError, setMasterError] = useState('');

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (newPath: string) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
    refetch(); // Check auth state on navigation
  };

  const quoteMatch = path.match(/^\/quote\/([^/]+)/);
  const adminMatch = path.match(/^\/admin\/([^/]+)/);
  const isSuperAdmin = path === '/master-control';
  const isLogin = path === '/login';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (isSuperAdmin) {
    if (!user?.isMaster) {
      const handleMasterLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
          const res = await fetch('/api/auth/master-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: masterPassword }),
            credentials: 'include',
          });
          if (res.ok) {
            refetch();
          } else {
            setMasterError('Invalid master password');
          }
        } catch (err) {
          setMasterError('Connection error');
        }
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
          <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
            <h2 className="text-2xl font-black text-white mb-6 text-center">Master Access Required</h2>
            <form onSubmit={handleMasterLogin} className="space-y-4">
              {masterError && <p className="text-red-400 text-sm text-center">{masterError}</p>}
              <input
                type="password"
                placeholder="Enter Master Password"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                required
              />
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Unlock Dashboard
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full text-slate-400 hover:text-white text-sm transition-colors"
              >
                Return to Site
              </button>
            </form>
          </div>
        </div>
      );
    }
    return <SuperAdmin />;
  }

  if (isLogin) {
    if (user && user.slug) {
      navigate(`/admin/${user.slug}`);
      return null;
    }
    return <LoginPage onNavigate={navigate} />;
  }

  if (user && user.is_verified === false && !user.isMaster) {
    return (
      <VerifyEmailForm
        email={user.email || ''}
        onVerified={refetch}
        onLogout={() => {
          refetch();
          navigate('/signup');
        }}
      />
    );
  }

  if (quoteMatch) {
    return <EstimatorForm companySlug={quoteMatch[1]} />;
  }

  if (adminMatch) {
    const slug = adminMatch[1];
    if (!user) {
      window.history.pushState({}, '', '/login');
      window.location.reload();
      return null;
    }
    // Check if user has access to this slug
    if (user.slug !== slug && !user.isMaster) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6 text-center">You do not have permission to access this dashboard.</p>
          <button
            onClick={() => navigate(`/admin/${user.slug}`)}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold"
          >
            Go to My Dashboard
          </button>
        </div>
      );
    }
    return <AdminDashboard companySlug={slug} />;
  }

  // Default Landing
  return <LandingPage onNavigate={navigate} />;
}
