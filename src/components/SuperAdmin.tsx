import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Rocket, 
  Settings, 
  Search, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layout,
  LogOut
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
  slug: string;
  ads_enabled: number;
  base_rate: number;
  logo_url?: string;
}

export default function SuperAdmin() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/super/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error("Failed to fetch companies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const toggleAds = async (companyId: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const res = await fetch(`/api/super/companies/${companyId}/ads`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ads_enabled: newStatus })
      });

      if (res.ok) {
        setCompanies(companies.map(c => 
          c.id === companyId ? { ...c, ads_enabled: newStatus } : c
        ));
        setShowSuccess(`Ads ${newStatus === 1 ? 'enabled' : 'disabled'} for company`);
        setTimeout(() => setShowSuccess(null), 3000);
      }
    } catch (err) {
      console.error("Failed to toggle ads:", err);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
          <p className="text-stone-500 font-medium">Loading Master Control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-stone-900 text-white py-8 px-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] -mr-48 -mt-48 pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8" aria-hidden="true">
                <rect x="14" y="22" width="4" height="8" rx="1" fill="white"/>
                <polygon points="4,22 16,6 28,22" fill="white" opacity="0.9"/>
                <polygon points="7,17 16,4 25,17" fill="white" opacity="0.75"/>
                <polygon points="10,13 16,2 22,13" fill="white" opacity="0.6"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">TreeQuote Pro Master Panel</h1>
              <p className="text-stone-400 text-sm font-medium">Global Management & Tenant Controls</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-stone-800/50 border border-stone-700 rounded-xl px-4 py-2 flex items-center gap-3">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold">{companies.length} Active Tenants</span>
            </div>
            <button 
              onClick={() => window.location.href = '/'}
              className="p-3 bg-stone-800 hover:bg-stone-700 rounded-xl text-stone-400 hover:text-white transition-all border border-stone-700"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Search & Filters */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input 
              type="text" 
              placeholder="Search tenants by name or slug..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Success Toast */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {showSuccess}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Company Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <motion.div 
              key={company.id}
              layout
              className="bg-white rounded-3xl border border-stone-200 shadow-sm hover:shadow-xl transition-all overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center overflow-hidden border border-stone-200">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain" />
                      ) : (
                        <Layout className="w-6 h-6 text-stone-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 leading-tight">{company.name}</h3>
                      <p className="text-xs text-stone-500 font-mono">/{company.slug}</p>
                    </div>
                  </div>
                  <a 
                    href={`/admin/${company.slug}`} 
                    target="_blank" 
                    className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-emerald-600 transition-colors"
                    title="View Admin Dashboard"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${company.ads_enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-200 text-stone-400'}`}>
                        <Rocket className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-stone-700">Marketing Banners</span>
                    </div>
                    <button
                      onClick={() => toggleAds(company.id, company.ads_enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${company.ads_enabled ? 'bg-emerald-600' : 'bg-stone-300'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${company.ads_enabled ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <div className="text-[10px] font-bold text-stone-400 uppercase mb-1">Base Rate</div>
                      <div className="text-sm font-bold text-stone-900">${company.base_rate}</div>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <div className="text-[10px] font-bold text-stone-400 uppercase mb-1">Status</div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-stone-700">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
                <button className="text-xs font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1 transition-colors">
                  <Settings className="w-3 h-3" /> Advanced Config
                </button>
                <div className="text-[10px] font-bold text-stone-400">ID: #{company.id}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-stone-300" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">No tenants found</h3>
            <p className="text-stone-500">Try adjusting your search term.</p>
          </div>
        )}
      </main>
    </div>
  );
}
