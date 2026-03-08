import React, { useState } from 'react';

interface Props {
  onSuccess?: (slug: string) => void;
}

export default function SignupForm({ onSuccess }: Props) {
  const [formData, setFormData] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
          phone: formData.phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error creating account');
        setLoading(false);
        return;
      }

      const createdSlug = data.slug;

      // 3. Send to GHL Webhook
      try {
        const { sendToGHL } = await import('../lib/auth');
        await sendToGHL({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          company_name: formData.companyName
        });
      } catch (ghlErr) {
        console.error('SignupForm: GHL Webhook error:', ghlErr);
      }

      if (onSuccess) {
        onSuccess(createdSlug);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
    // We don't set loading to false in finally if we are navigating away
    // but if there was an error, we already set it to false above.
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Company Name</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">business</span>
          <input
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
            placeholder="Tree Care Pros"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">First Name</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">person</span>
            <input
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
              placeholder="John"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Last Name</label>
          <input
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
            placeholder="Doe"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Work Email</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">mail</span>
          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
            placeholder="name@company.com"
            type="email"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
          Phone Number
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">call</span>
          <input
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
            placeholder="(555) 000-0000"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
          <input
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
            placeholder="••••••••"
            type="password"
            required
          />
        </div>
      </div>

      <button
        disabled={loading}
        className="w-full bg-secondary hover:bg-orange-600 text-white font-black py-4 rounded-xl shadow-xl shadow-secondary/20 transition-all transform hover:-translate-y-1 active:scale-[0.98] mt-4 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        type="submit"
      >
        {loading ? 'Creating Account...' : 'Create My Free Account'}
        {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
      </button>
    </form>
  );
}
