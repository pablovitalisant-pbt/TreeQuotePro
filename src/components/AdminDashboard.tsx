import { useState, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Search, 
  Filter,
  MoreVertical,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Webhook,
  Save,
  CheckCircle2,
  Share2,
  Link,
  Image as ImageIcon,
  X,
  Download,
  Maximize2,
  Rocket,
  Sparkles,
  ArrowRight,
  Zap,
  Settings,
  LogOut
} from 'lucide-react';

interface Props {
  companySlug: string;
}

export default function AdminDashboard({ companySlug }: Props) {
  const [activeTab, setActiveTab] = useState<'leads' | 'settings'>('leads');
  const [leads, setLeads] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Settings State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [baseRate, setBaseRate] = useState(50);
  const [heightRate, setHeightRate] = useState(10);
  const [diameterRate, setDiameterRate] = useState(5);
  const [hazardMultiplier, setHazardMultiplier] = useState(1.5);
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#059669');
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showBanners, setShowBanners] = useState(false);
  const [dismissedTopBanner, setDismissedTopBanner] = useState(false);
  const [dismissedTableBanner, setDismissedTableBanner] = useState(false);
  const [selectedLeadImages, setSelectedLeadImages] = useState<string[] | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    won: 0,
    potential: 0
  });

  const fetchData = async () => {
    try {
      console.log(`Fetching data for: ${companySlug}`);
      
      // Verify session
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        window.history.pushState({}, '', '/login');
        window.location.reload();
        return;
      }

      // Fetch Company Info
      const companyRes = await fetch(`/api/companies/${companySlug}`);
      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData);
        setWebhookUrl(companyData.webhook_url || '');
        setBaseRate(companyData.base_rate || 50);
        setHeightRate(companyData.height_rate || 10);
        setDiameterRate(companyData.diameter_rate || 5);
        setHazardMultiplier(companyData.hazard_multiplier || 1.5);
        setLogoUrl(companyData.logo_url || '');
        setPrimaryColor(companyData.primary_color || '#059669');
        setAdsEnabled(companyData.ads_enabled !== 0);
      }

      // Fetch Leads
      const res = await fetch(`/api/admin/${companySlug}/leads`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API Error (${res.status}): ${errorText}`);
      }
      const data = await res.json();
      console.log(`Leads received: ${data.length}`);
      setLeads(data);
      
      const won = data.filter((l: any) => l.status === 'Job Won').length;
      const newLeads = data.filter((l: any) => l.status === 'New').length;
      // Pipeline Value only counts 'New' and 'Contacted' leads
      const potential = data
        .filter((l: any) => l.status === 'New' || l.status === 'Contacted')
        .reduce((acc: number, l: any) => acc + l.estimated_max, 0);
      
      setStats({
        total: data.length,
        new: newLeads,
        won: won,
        potential: potential
      });
      setLoading(false);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companySlug]);

  useEffect(() => {
    if (company && company.created_at) {
      const registrationDate = new Date(company.created_at);
      const now = new Date();
      const diffInMs = now.getTime() - registrationDate.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      
      if (diffInHours >= 24) {
        const timer = setTimeout(() => setShowBanners(true), 2000);
        return () => clearTimeout(timer);
      } else {
        setShowBanners(false);
      }
    }
  }, [company]);

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/companies/${companySlug}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          webhook_url: webhookUrl,
          base_rate: baseRate,
          height_rate: heightRate,
          diameter_rate: diameterRate,
          hazard_multiplier: hazardMultiplier,
          logo_url: logoUrl,
          primary_color: primaryColor,
          ads_enabled: adsEnabled ? 1 : 0
        })
      });
      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      window.history.pushState({}, '', '/');
      window.location.reload();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/quote/${companySlug}`;
    navigator.clipboard.writeText(shareUrl);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('images', e.target.files[0]);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.urls[0]);
      }
    } catch (err) {
      console.error("Logo upload failed:", err);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const downloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = url.split('/').pop() || 'tree-photo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  if (loading) return <div className="p-8">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Sidebar / Nav */}
      <nav className="bg-stone-900 text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-6 h-6" aria-hidden="true">
              <rect x="14" y="22" width="4" height="8" rx="1" fill="#5a3a1a"/>
              <polygon points="4,22 16,6 28,22" fill="#059669"/>
              <polygon points="7,17 16,4 25,17" fill="#047857"/>
              <polygon points="10,13 16,2 22,13" fill="#065f46"/>
            </svg>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight leading-none">TreeQuote Pro</span>
              <span className="text-[10px] text-stone-400 font-medium">powered by PBT Digital Services</span>
            </div>
          </div>
          
          <div className="flex gap-1 bg-stone-800 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'leads' ? 'bg-stone-700 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
            >
              Leads
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-stone-700 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
            >
              Settings
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-stone-400 bg-stone-800 px-3 py-1 rounded-full border border-stone-700">
            {companySlug}
          </div>
          <button 
            onClick={handleShareLink}
            className={`${isCopying ? 'bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'} px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20`}
          >
            {isCopying ? (
              <><CheckCircle2 className="w-4 h-4" /> Copied!</>
            ) : (
              <><Share2 className="w-4 h-4" /> Share Link</>
            )}
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {/* Value Ladder Advertisement - Growth Hub Banner */}
        <AnimatePresence>
          {adsEnabled && showBanners && !dismissedTopBanner && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 32 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden relative"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Exclusive Tool for TreeQuote Pro Users</span>
                <div className="h-px flex-1 bg-stone-200" />
                <button 
                  onClick={() => setDismissedTopBanner(true)}
                  className="p-1 hover:bg-stone-200 rounded-full transition-colors text-stone-400 hover:text-stone-600"
                  title="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="bg-stone-900 rounded-3xl p-1 shadow-2xl shadow-stone-200 group">
                <div className="bg-stone-900 border border-stone-800 rounded-[22px] p-8 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
                  {/* Background Glow */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] -mr-48 -mt-48 pointer-events-none" />
                  
                  <div className="flex-1 relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                        <Rocket className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Tree Job Capture System</span>
                          <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                        </div>
                      </div>
                    </div>
                    
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-4">How Many Tree Jobs Are You Losing From Missed Calls?</h2>
                    
                    <div className="space-y-4 text-stone-400 text-sm max-w-2xl">
                      <p>When you're climbing, running equipment, or driving to the next job… <span className="text-white font-bold italic">the phone rings.</span></p>
                      <p>And if you don't answer… that homeowner usually hires the next tree company who does.</p>
                      <p className="text-emerald-400 font-medium">The Tree Job Capture System makes sure missed calls don't turn into lost jobs.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                        <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Capture opportunities even when you're on a job site
                        </div>
                        <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Be the first company to respond — automatically
                        </div>
                        <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Turn missed calls into booked estimates
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center lg:items-end gap-4 relative z-10">
                    <div className="text-center lg:text-right">
                      <div className="text-xs text-stone-500 line-through mb-1">Standard Setup $997</div>
                      <div className="text-emerald-400 font-black text-xl">Exclusive Partner Access</div>
                    </div>
                    <button 
                      onClick={() => window.open('https://calendly.com/your-link', '_blank')}
                      className="bg-white text-stone-900 px-8 py-4 rounded-2xl font-black text-base hover:bg-emerald-400 hover:text-white transition-all flex items-center gap-3 shadow-2xl active:scale-95 group-hover:translate-y-[-2px]"
                    >
                      See How It Works <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'settings' ? (
          <div className="space-y-8">
            {/* Branding Settings */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900">Branding & Identity</h3>
                  <p className="text-xs text-stone-500">Customize how your estimator looks to customers.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Company Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-center overflow-hidden relative group">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-stone-300" />
                      )}
                      {isUploadingLogo && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-emerald-600 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input 
                        type="file" 
                        id="logo-upload" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                      <label 
                        htmlFor="logo-upload"
                        className="inline-block px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm font-bold cursor-pointer transition-colors"
                      >
                        {logoUrl ? 'Change Logo' : 'Upload Logo'}
                      </label>
                      <p className="text-[10px] text-stone-400">Recommended: Transparent PNG, square or horizontal.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Primary Brand Color</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-16 rounded-xl cursor-pointer border-none bg-transparent"
                    />
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <p className="text-[10px] text-stone-400 mt-1">This color will be used for buttons and accents.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Multipliers Settings */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900">Price Multipliers</h3>
                  <p className="text-xs text-stone-500">Define how your estimates are calculated.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Base Rate ($)</label>
                    <input 
                      type="number" 
                      value={baseRate}
                      onChange={(e) => setBaseRate(parseFloat(e.target.value))}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">Starting price for any job.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Height Rate ($ per foot)</label>
                    <input 
                      type="number" 
                      value={heightRate}
                      onChange={(e) => setHeightRate(parseFloat(e.target.value))}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Diameter Rate ($ per inch)</label>
                    <input 
                      type="number" 
                      value={diameterRate}
                      onChange={(e) => setDiameterRate(parseFloat(e.target.value))}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Hazard Multiplier (x)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={hazardMultiplier}
                      onChange={(e) => setHazardMultiplier(parseFloat(e.target.value))}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">Applied when trees are near houses or power lines.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Webhook Settings */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Webhook className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900">Integration Settings</h3>
                  <p className="text-xs text-stone-500">Connect to your CRM via Webhook.</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Your Public Estimator Link</label>
                  <div className="flex gap-2">
                    <div className="flex-1 px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-sm text-stone-600 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                      {window.location.origin}/quote/{companySlug}
                    </div>
                    <button 
                      onClick={handleShareLink}
                      className="bg-stone-200 hover:bg-stone-300 p-3 rounded-xl transition-colors"
                      title="Copy Link"
                    >
                      {isCopying ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Link className="w-5 h-5 text-stone-600" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-2 italic">Send this link to your customers to get instant estimates.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Webhook URL</label>
                  <input 
                    type="url" 
                    placeholder="https://services.leadconnectorhq.com/hooks/..." 
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Upsell Card in Settings */}
            <AnimatePresence>
              {adsEnabled && showBanners && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-emerald-600 rounded-3xl p-10 text-white relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 blur-[100px] -mr-40 -mt-40" />
                  <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-2 mb-6">
                        <Zap className="w-6 h-6 text-emerald-200 fill-emerald-200" />
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-emerald-100">Tree Job Capture System</span>
                      </div>
                      <h3 className="text-4xl font-black mb-6 leading-tight">Capture More Tree Jobs Without Answering Every Call</h3>
                      
                      <div className="space-y-4 text-emerald-50 text-lg mb-8">
                        <p>Tree service owners are rarely sitting behind a desk. You're usually climbing trees, running equipment, managing your crew, or driving between jobs.</p>
                        <p className="font-bold text-white">The Tree Job Capture System helps you capture those opportunities automatically.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 bg-emerald-700/40 px-4 py-3 rounded-2xl text-sm font-bold border border-emerald-500/30">
                          <CheckCircle2 className="w-5 h-5 text-emerald-300" /> Turn missed calls into new jobs
                        </div>
                        <div className="flex items-center gap-3 bg-emerald-700/40 px-4 py-3 rounded-2xl text-sm font-bold border border-emerald-500/30">
                          <CheckCircle2 className="w-5 h-5 text-emerald-300" /> Less time chasing leads
                        </div>
                        <div className="flex items-center gap-3 bg-emerald-700/40 px-4 py-3 rounded-2xl text-sm font-bold border border-emerald-500/30">
                          <CheckCircle2 className="w-5 h-5 text-emerald-300" /> Focus on bigger jobs
                        </div>
                        <div className="flex items-center gap-3 bg-emerald-700/40 px-4 py-3 rounded-2xl text-sm font-bold border border-emerald-500/30">
                          <CheckCircle2 className="w-5 h-5 text-emerald-300" /> 24/7 Automated Response
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-center lg:text-right">
                      <div className="mb-8">
                        <div className="text-emerald-200 text-sm font-black uppercase tracking-widest mb-2">Exclusive Partner Pricing</div>
                        <div className="text-5xl font-black text-white">$0 Setup Fee</div>
                      </div>
                      <button 
                        onClick={() => window.open('https://calendly.com/your-link', '_blank')}
                        className="bg-white text-emerald-600 px-10 py-5 rounded-2xl font-black text-xl hover:bg-emerald-50 transition-all shadow-2xl shadow-emerald-900/40 flex items-center gap-3 group-hover:scale-105"
                      >
                        See How It Works <ArrowRight className="w-7 h-7" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end">
              <button 
                onClick={saveSettings}
                disabled={isSavingSettings}
                className="bg-stone-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center gap-3 disabled:opacity-50 shadow-lg shadow-stone-200"
              >
                {isSavingSettings ? 'Saving...' : showSuccess ? <><CheckCircle2 className="w-5 h-5" /> All Settings Saved</> : <><Save className="w-5 h-5" /> Save All Changes</>}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-blue-600' },
                { label: 'New Leads', value: stats.new, icon: Clock, color: 'text-orange-600' },
                { label: 'Jobs Won', value: stats.won, icon: TrendingUp, color: 'text-emerald-600' },
                { label: 'Pipeline Value', value: `$${stats.potential.toLocaleString()}`, icon: AlertCircle, color: 'text-stone-900' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{stat.label}</span>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-stone-900">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Lead Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="p-6 border-bottom border-stone-100 flex items-center justify-between bg-stone-50/50">
                <h2 className="font-bold text-stone-900 flex items-center gap-2">
                  Recent Leads
                  <span className="bg-stone-200 text-stone-600 text-[10px] px-2 py-0.5 rounded-full">{leads.length}</span>
                </h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input 
                      type="text" 
                      placeholder="Search leads..." 
                      className="pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <button className="p-2 border border-stone-200 rounded-lg hover:bg-white transition-colors">
                    <Filter className="w-4 h-4 text-stone-600" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Lead Info</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Tree Details</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Photos</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Estimate</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Risk</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {/* Inline Table Banner for New Leads */}
                    <AnimatePresence>
                      {adsEnabled && showBanners && !dismissedTableBanner && leads.some(l => l.status === 'New') && (
                        <motion.tr 
                          initial={{ opacity: 0, backgroundColor: '#ffffff' }}
                          animate={{ opacity: 1, backgroundColor: '#f0fdf4' }} // emerald-50
                          exit={{ opacity: 0, height: 0 }}
                          className="border-b border-emerald-100 relative"
                        >
                          <td colSpan={7} className="px-6 py-6 relative">
                            <button 
                              onClick={() => setDismissedTableBanner(true)}
                              className="absolute top-4 right-4 p-2 hover:bg-emerald-100 rounded-full transition-colors text-emerald-400 hover:text-emerald-600 z-20"
                              title="Dismiss"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <Phone className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-stone-900 text-base leading-tight">Seeing Leads Come In Is Great… But What About The Calls You Miss?</h3>
                                  <p className="text-stone-600 text-xs mt-1">See how tree companies capture those jobs with the <span className="text-emerald-700 font-bold">Tree Job Capture System</span>.</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => window.open('https://calendly.com/your-link', '_blank')}
                                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 whitespace-nowrap group"
                              >
                                See How It Works <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>

                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-stone-900">{lead.name}</div>
                          <a 
                            href={`mailto:${lead.email}`}
                            className="text-xs text-stone-500 flex items-center gap-1 mt-1 hover:text-emerald-600 transition-colors group"
                            title="Send Email"
                          >
                            <Mail className="w-3 h-3 group-hover:scale-110 transition-transform" /> 
                            <span className="group-hover:underline underline-offset-2">{lead.email}</span>
                          </a>
                          <a 
                            href={`tel:${lead.phone}`}
                            className="text-xs text-stone-500 flex items-center gap-1 mt-0.5 hover:text-emerald-600 transition-colors group"
                            title="Call Phone"
                          >
                            <Phone className="w-3 h-3 group-hover:scale-110 transition-transform" /> 
                            <span className="group-hover:underline underline-offset-2">{lead.phone}</span>
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-stone-700">{lead.tree_species} ({lead.tree_height}ft)</div>
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lead.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-stone-500 flex items-center gap-1 mt-1 hover:text-emerald-600 transition-colors group"
                            title="Open in Maps"
                          >
                            <MapPin className="w-3 h-3 group-hover:scale-110 transition-transform" /> 
                            <span className="underline decoration-stone-200 underline-offset-2 group-hover:decoration-emerald-200">{lead.address}</span>
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          {lead.images ? (
                            <button 
                              onClick={() => setSelectedLeadImages(lead.images.split(','))}
                              className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
                            >
                              <ImageIcon className="w-3 h-3" />
                              {lead.images.split(',').length} Photos
                            </button>
                          ) : (
                            <span className="text-xs text-stone-400">No photos</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-emerald-600">
                            ${lead.estimated_min.toLocaleString()} - ${lead.estimated_max.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                            lead.proximity_hazard === 'power-lines' ? 'bg-red-100 text-red-700' : 
                            lead.proximity_hazard === 'near-house' ? 'bg-orange-100 text-orange-700' : 
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {lead.proximity_hazard}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={lead.status}
                            onChange={(e) => updateStatus(lead.id, e.target.value)}
                            className={`text-xs font-bold p-1.5 rounded-lg border outline-none ${
                              lead.status === 'Job Won' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                              lead.status === 'Tire-Kicker' ? 'bg-stone-100 border-stone-200 text-stone-500' :
                              lead.status === 'Rejected' ? 'bg-red-50 border-red-200 text-red-700' :
                              'bg-blue-50 border-blue-200 text-blue-700'
                            }`}
                          >
                            <option>New</option>
                            <option>Contacted</option>
                            <option>Job Won</option>
                            <option>Tire-Kicker</option>
                            <option>Rejected</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 hover:bg-stone-200 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4 text-stone-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Image Modal */}
      {selectedLeadImages && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-bold text-stone-900">Lead Photos</h3>
              <button 
                onClick={() => setSelectedLeadImages(null)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-stone-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedLeadImages.map((url, i) => (
                <div key={i} className="group relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-50">
                  <img 
                    src={url} 
                    alt={`Lead photo ${i + 1}`} 
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      onClick={() => window.open(url, '_blank')}
                      className="bg-white text-stone-900 p-3 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-100 transition-all transform translate-y-4 group-hover:translate-y-0"
                    >
                      <Maximize2 className="w-5 h-5" />
                      View Full Size
                    </button>
                    <button 
                      onClick={() => downloadImage(url)}
                      className="bg-emerald-600 text-white p-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all transform translate-y-4 group-hover:translate-y-0 delay-75"
                    >
                      <Download className="w-5 h-5" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
