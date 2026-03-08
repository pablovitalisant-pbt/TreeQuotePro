import React, { useState, useEffect } from 'react';

interface Props {
  onNavigate: (path: string) => void;
}

export default function LandingPage({ onNavigate }: Props) {
  const [userCount, setUserCount] = useState<number>(0);
  const targetUsers = 1000;

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async (attempt: number) => {
      try {
        const res = await fetch('/api/stats/user-count');
        if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
          // Server not ready yet — retry with backoff
          if (attempt < 5 && !cancelled) {
            setTimeout(() => fetchCount(attempt + 1), Math.min(1000 * 2 ** (attempt - 1), 16000));
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) setUserCount(data.count ?? 0);
      } catch {
        if (attempt < 5 && !cancelled) {
          setTimeout(() => fetchCount(attempt + 1), Math.min(1000 * 2 ** (attempt - 1), 16000));
        }
      }
    };
    fetchCount(1);
    return () => { cancelled = true; };
  }, []);

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, companyName, phone }),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok) {
        onNavigate(`/admin/${data.slug}`);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">park</span>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                TreeQuote <span className="text-primary">Pro</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onNavigate('/login')}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
              >
                Login
              </button>
              <a 
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm" 
                href="#signup"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-slate-900 dark:text-white mb-6">
                Stop Driving Across Town for Tree Estimates That Never Turn Into Jobs
              </h1>
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                Use TreeQuote Pro to let homeowners see a realistic tree removal price range before you drive out for an estimate — so you spend your time talking to people who already understand the cost.
              </p>
              <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary font-bold">check_circle</span>
                  <span className="text-slate-700 dark:text-slate-200">Homeowners see a realistic price range before requesting an estimate</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary font-bold">check_circle</span>
                  <span className="text-slate-700 dark:text-slate-200">You receive the lead and job details instantly in your dashboard</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary font-bold">check_circle</span>
                  <span className="text-slate-700 dark:text-slate-200">Decide which estimates are worth your time before calling back</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary font-bold">check_circle</span>
                  <span className="text-slate-700 dark:text-slate-200">Works 24/7 while you're out doing jobs</span>
                </li>
              </ul>
            </div>
            {/* Signup Form */}
            <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden" id="signup">
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              
              <div className="relative z-10">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2 text-center tracking-tight">Sign up for free – forever!</h3>
                <p className="text-slate-500 dark:text-slate-400 text-center mb-4 text-sm leading-relaxed">
                  No credit card required. Get instant access to our software at zero cost, with no hidden fees or subscriptions – ever.
                </p>
                
                <div className="mb-8 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-primary font-black text-xs uppercase tracking-widest text-center mb-3">Exclusive offer for the first 1,000 users only.</p>
                  <div className="relative h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div 
                      className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min((userCount / targetUsers) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    <span>{userCount.toLocaleString()} Users Registered</span>
                    <span>{targetUsers.toLocaleString()} Target</span>
                  </div>
                </div>
                
                <form className="space-y-5" onSubmit={handleSignup}>
                  {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <span className="material-symbols-outlined text-red-400">error</span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Company Name</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">business</span>
                      <input 
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm" 
                        placeholder="Mike's Tree Service" 
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Work Email</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">mail</span>
                      <input 
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm" 
                        placeholder="name@company.com" 
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Phone Number</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">call</span>
                      <input 
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm" 
                        placeholder="(555) 000-0000" 
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Create Password</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
                      <input 
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm" 
                        placeholder="••••••••" 
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 ml-1">Minimum 8 characters</p>
                  </div>

                  <button 
                    className="w-full bg-secondary hover:bg-orange-600 text-white font-black py-4 rounded-xl shadow-xl shadow-secondary/20 transition-all transform hover:-translate-y-1 active:scale-[0.98] mt-4 flex items-center justify-center gap-2 text-lg disabled:opacity-50" 
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create My Free Account'}
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </form>
                
                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                  <span className="material-symbols-outlined text-xs">verified_user</span>
                  Secure & Encrypted Setup
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="bg-slate-900 text-white py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-12 text-primary">Every Tree Service Owner Has Experienced This</h2>
          <div className="space-y-6 text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto italic">
            <p>You drive 25 minutes to a property.</p>
            <p>Walk the yard.</p>
            <p>Look at the tree.</p>
            <p>Measure the trunk.</p>
            <p>Explain the removal.</p>
            <p>Give them the quote.</p>
            <p className="text-white font-bold not-italic">Then they say:</p>
            <p className="text-secondary text-2xl font-bold">"Oh… we didn’t think it would be that much."</p>
            <p>So you thank them for their time… get back in the truck… and drive to the next estimate.</p>
            <p className="text-white">Another hour gone.</p>
            <p>And the job was never serious to begin with.</p>
          </div>
          <div className="mt-16 pt-16 border-t border-slate-800 text-left grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xl font-semibold mb-4">The truth is simple:</p>
              <p className="text-slate-400 mb-6">Most homeowners requesting estimates have no idea what tree removal actually costs. So they call several companies… get multiple quotes… and many times never hire anyone.</p>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-xl">
              <p className="text-primary font-bold mb-2">Meanwhile you're the one paying the price in:</p>
              <div className="flex flex-wrap gap-4 text-white font-bold">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-secondary">local_gas_station</span> fuel</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-secondary">schedule</span> time</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-secondary">money_off</span> lost work hours</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 bg-white dark:bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <img 
                alt="Tree professional checking a removal job" 
                className="rounded-2xl shadow-2xl object-cover w-full h-[500px]" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYnX9-jBMvtcgDDcrx0Xgs06GAEHDuApfAerWuaP0MGbleG8zsqSFjFdH8EOSvmMhtBtYxqJHHGTO0sMRCou8t8La1cofbGCdB0d8F_YZIxSvp66ce_YRfQl0B_i98E3p1zcjbM1KzyJBTyikz63zrFpXBgYr3LaHvvO4pSIsgktji9VN5DezqTfpwbgDZMuYMBGx0fu5iVZsOkDwcnmvYmfRJKFZdSN3uL7tgoLDF9mcXxbszAx6pahtuGt7788dq939esm6HV479" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="lg:w-1/2">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-6">What If Homeowners Could See the Price Range Before You Visit?</h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
                With TreeQuote Pro, homeowners can estimate the cost of tree removal before you ever leave the job site. You simply share your unique TreeQuote link with them.
              </p>
              <div className="bg-primary/5 dark:bg-primary/10 p-6 rounded-xl border-l-4 border-primary mb-8">
                <p className="font-bold text-slate-900 dark:text-white mb-3">They open the estimator and enter details like:</p>
                <ul className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-sm">circle</span> Tree species</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-sm">circle</span> Height and diameter</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-sm">circle</span> Risk factors</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-sm">circle</span> Distance to structures</li>
                </ul>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-6 italic">
                Within seconds they see a realistic price range for the job. If the homeowner proceeds with the estimate request… their information and job details appear instantly in your TreeQuote dashboard.
              </p>
              <p className="text-xl font-bold text-primary">So before you even call them back… you already know if the job looks like a $500 trim or a $5,000 removal.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-background-light dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4">Spend Your Time on Jobs That Actually Make Sense</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">Instead of driving across town for every request… you can review the estimate information first and decide which opportunities are worth pursuing.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <span className="material-symbols-outlined text-primary text-4xl mb-4">travel</span>
              <h4 className="font-bold text-lg mb-2">Fewer wasted trips</h4>
              <p className="text-slate-500 text-sm">Eliminate unrealistic estimates that never close.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <span className="material-symbols-outlined text-primary text-4xl mb-4">visibility</span>
              <h4 className="font-bold text-lg mb-2">Better visibility</h4>
              <p className="text-slate-500 text-sm">See potential job value before picking up the phone.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <span className="material-symbols-outlined text-primary text-4xl mb-4">event_available</span>
              <h4 className="font-bold text-lg mb-2">Efficient scheduling</h4>
              <p className="text-slate-500 text-sm">Prioritize the most profitable site visits first.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <span className="material-symbols-outlined text-primary text-4xl mb-4">trending_up</span>
              <h4 className="font-bold text-lg mb-2">Profitable work</h4>
              <p className="text-slate-500 text-sm">Spend more time on-site doing high-value removals.</p>
            </div>
          </div>
          <div className="mt-16 text-center max-w-2xl mx-auto">
            <p className="text-slate-700 dark:text-slate-300 mb-4">And the best part? Homeowners can submit estimates any time of day, even while you're busy running jobs.</p>
            <p className="text-2xl font-black text-primary italic">TreeQuote Pro becomes a simple lead qualification tool for your business.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white dark:bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-16">Get Started in Less Than 10 Minutes</h2>
          <div className="grid lg:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <div className="relative z-10 text-center px-6">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">1</div>
              <h4 className="text-xl font-bold mb-3">Create your account</h4>
              <p className="text-slate-600 dark:text-slate-400">Create your free TreeQuote Pro account to unlock your unique dashboard.</p>
            </div>
            {/* Step 2 */}
            <div className="relative z-10 text-center px-6">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">2</div>
              <h4 className="text-xl font-bold mb-3">Set your pricing</h4>
              <p className="text-slate-600 dark:text-slate-400">Set your base pricing for tree removal jobs based on your specific rates.</p>
            </div>
            {/* Step 3 */}
            <div className="relative z-10 text-center px-6">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">3</div>
              <h4 className="text-xl font-bold mb-3">Share your link</h4>
              <p className="text-slate-600 dark:text-slate-400">Share your unique TreeQuote link with potential customers via text, email, or your site.</p>
            </div>
          </div>
          <div className="mt-16 bg-slate-50 dark:bg-slate-900/40 p-10 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            <p className="font-semibold text-slate-800 dark:text-slate-200 mb-6">You can send the link by:</p>
            <div className="flex flex-wrap justify-center gap-6 text-slate-600 dark:text-slate-400 font-medium">
              <span className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2"><span className="material-symbols-outlined text-primary">sms</span> text message</span>
              <span className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2"><span className="material-symbols-outlined text-primary">mail</span> email</span>
              <span className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2"><span className="material-symbols-outlined text-primary">chat</span> WhatsApp</span>
              <span className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2"><span className="material-symbols-outlined text-primary">share</span> social media</span>
              <span className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2"><span className="material-symbols-outlined text-primary">add_link</span> or add it to a button on your website</span>
            </div>
            <p className="mt-10 text-xl font-bold text-slate-900 dark:text-white">When a homeowner completes an estimate, the information appears instantly in your dashboard.</p>
          </div>
        </div>
      </section>

      {/* Authority Section */}
      <section className="py-24 bg-primary text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-black mb-8 leading-tight">Built Specifically for Tree Service Companies</h2>
              <p className="text-xl text-primary-100 mb-8 leading-relaxed">
                TreeQuote Pro isn't a generic estimator. It was designed specifically for tree removal companies in the United States, using real industry variables such as:
              </p>
              <ul className="space-y-4 text-lg">
                <li className="flex items-center gap-3"><span className="material-symbols-outlined">straighten</span> tree size</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined">nature</span> species</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined">warning</span> risk factors</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined">home</span> proximity to structures</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined">construction</span> job complexity</li>
              </ul>
            </div>
            <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl border border-white/20">
              <p className="text-2xl font-bold mb-6">Which means the price ranges homeowners see are much closer to real market pricing.</p>
              <p className="text-lg text-primary-50">This helps homeowners understand the likely cost of the job before you ever visit the property.</p>
            </div>
          </div>
        </div>
        {/* Abstract Background Pattern */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 opacity-10">
          <span className="material-symbols-outlined text-[400px]">park</span>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background-light dark:bg-background-dark text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-6">Stop Driving to Estimates That Were Never Going to Close</h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed">
            With TreeQuote Pro, homeowners can see realistic price ranges first — and you can review estimate details before deciding who to call back.
          </p>
          <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-12">
            <div className="flex items-center gap-2 text-primary font-bold">
              <span className="material-symbols-outlined">check</span> Spend less time chasing uncertain quotes.
            </div>
            <div className="flex items-center gap-2 text-primary font-bold">
              <span className="material-symbols-outlined">check</span> And more time working on real jobs.
            </div>
          </div>
          <a 
            className="inline-block bg-secondary hover:bg-orange-600 text-white text-2xl font-black px-12 py-6 rounded-xl shadow-2xl transition-all transform hover:scale-105 mb-8" 
            href="#signup"
          >
            Create Your Free Account Now
          </a>
          <p className="text-slate-500 dark:text-slate-400">Join smart tree care professionals growing their business with TreeQuote Pro.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="material-symbols-outlined text-primary text-2xl">park</span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              TreeQuote <span className="text-primary">Pro</span>
            </span>
          </div>
          <nav className="flex flex-wrap justify-center gap-8 mb-8 text-slate-500 dark:text-slate-400 text-sm font-medium">
            <a className="hover:text-primary" href="#">Privacy Policy</a>
            <a className="hover:text-primary" href="#">Terms of Service</a>
            <a className="hover:text-primary" href="#">Support</a>
            <a className="hover:text-primary" href="#">Pricing</a>
          </nav>
          <p className="text-slate-400 dark:text-slate-500 text-xs">© 2026 TreeQuote Pro Inc. Built Specifically for the Tree Care Industry.</p>
        </div>
      </footer>
    </div>
  );
}
