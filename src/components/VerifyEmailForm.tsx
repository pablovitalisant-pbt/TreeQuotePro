import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
  email: string;
  onVerified?: () => void;
  onLogout?: () => void;
}

export default function VerifyEmailForm({ email, onVerified }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      toast.success('Email verified! Redirecting...');
      setSuccess(true);
      if (onVerified) onVerified();
    } catch (err: any) {
      const message = err.message || 'An unexpected error occurred';
      if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid')) {
        toast.error('Invalid or expired code. Please try again.');
      } else {
        toast.error(message);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Resend failed');
      }

      toast.success('Verification code sent successfully!');
      setCooldown(60);
    } catch (err: any) {
      const message = err.message || 'An unexpected error occurred';
      toast.error(message);
      setError(message);
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (onLogout) onLogout();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 text-center">Verify Your Email</h2>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-6 text-sm">
          Enter the 6-digit code we sent to <span className="font-semibold">{email}</span>.
        </p>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl mb-4">
            Verification successful. Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
              Verification Code
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">pin</span>
              <input
                name="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
                placeholder="123456"
                required
                maxLength={6}
                inputMode="numeric"
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-xl shadow-xl shadow-primary/20 transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full text-primary font-bold py-3 rounded-xl border border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? 'Resending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm underline-offset-2 hover:underline transition-all"
          >
            Wrong email? Register with a different account
          </button>
        </form>
      </div>
    </div>
  );
}
