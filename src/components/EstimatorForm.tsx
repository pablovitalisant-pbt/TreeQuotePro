import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TreeDeciduous, 
  Ruler, 
  AlertTriangle, 
  Camera, 
  User, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Truck,
  Zap,
  Home,
  ShieldAlert,
  X,
  MapPin,
  Search,
  Loader2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { calculateEstimate } from '../utils/estimationLogic';

// Fix Leaflet icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
}

interface Props {
  companySlug: string;
}

export default function EstimatorForm({ companySlug }: Props) {
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);

  const [formData, setFormData] = useState({
    species: 'Oak',
    height: 30,
    diameter: 12,
    proximity: 'clear',
    condition: 'healthy',
    access: 'truck',
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    console.log(`Fetching company data for: ${companySlug}`);
    fetch(`/api/companies/${companySlug}`)
      .then(async res => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`API Error (${res.status}): ${errorText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log("Company data received:", data);
        setCompany(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, [companySlug]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          });
        },
        (err) => console.warn("Geolocation error:", err),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
      );
    }
  }, []);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files].slice(0, 5)); // Limit to 5
    }
  };

  const searchAddress = async (query: string) => {
    if (query.length < 5) return;
    setIsSearchingAddress(true);
    try {
      let url = `/api/geocode?q=${encodeURIComponent(query)}`;
      
      // Bias results to user location if available
      if (userLocation) {
        url += `&lat=${userLocation.lat}&lon=${userLocation.lon}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Geocoding failed");
      const data = await res.json();
      setAddressSuggestions(data);
    } catch (err) {
      console.error("Geocoding error:", err);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.address.length >= 5 && !isAddressValid) {
        searchAddress(formData.address);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [formData.address, isAddressValid]);

  const selectAddress = (suggestion: any) => {
    setFormData({ ...formData, address: suggestion.display_name });
    setMapCenter([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
    setIsAddressValid(true);
    setAddressSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    let imageUrls: string[] = [];
    if (selectedFiles.length > 0) {
      const uploadFormData = new FormData();
      selectedFiles.forEach(file => uploadFormData.append('images', file));
      
      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData
        });
        if (uploadRes.ok) {
          const { urls } = await uploadRes.json();
          imageUrls = urls;
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
    
    const result = calculateEstimate({
      height: formData.height,
      diameter: formData.diameter,
      proximity: formData.proximity as any,
      condition: formData.condition as any,
      access: formData.access as any,
      baseRate: company?.base_rate || 50,
      heightRate: company?.height_rate,
      diameterRate: company?.diameter_rate,
      hazardMultiplier: company?.hazard_multiplier,
    });

    setEstimate(result);

    const payload = {
      ...formData,
      company_id: company.id,
      estimated_min: result.min,
      estimated_max: result.max,
      tree_height: formData.height,
      tree_diameter: formData.diameter,
      proximity_hazard: formData.proximity,
      tree_species: formData.species,
      images: imageUrls.join(',')
    };

    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-stone-100">Loading...</div>;
  if (!company) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-100 text-stone-900 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-red-100 text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Company Not Found</h2>
        <p className="text-stone-600 mb-6">
          We couldn't find a tree service profile for <span className="font-mono font-bold text-red-600">"{companySlug}"</span>.
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-stone-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-stone-800 transition-colors"
        >
          Return Home
        </button>
      </div>
    </div>
  );

  if (submitted) {
    const primaryColor = company.primary_color || '#059669';
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded-3xl shadow-xl border border-stone-200 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6 inline-block p-4 rounded-full"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <CheckCircle2 className="w-12 h-12" style={{ color: primaryColor }} />
        </motion.div>
        <h2 className="text-3xl font-bold text-stone-900 mb-4">Your Estimate is Ready!</h2>
        <p className="text-stone-600 mb-8">Based on your inputs, here is the estimated range for removal:</p>
        
        <div className="bg-stone-900 text-white p-8 rounded-2xl mb-8">
          <div className="text-sm uppercase tracking-widest text-stone-400 mb-2">Estimated Range</div>
          <div className="text-5xl font-bold" style={{ color: primaryColor }}>
            ${estimate.min.toLocaleString()} - ${estimate.max.toLocaleString()}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <ShieldAlert className={`w-5 h-5 ${estimate.riskLevel === 'high' ? 'text-orange-500' : ''}`} style={estimate.riskLevel !== 'high' ? { color: primaryColor } : {}} />
            <span className="text-sm font-medium">Risk Level: {estimate.riskLevel.toUpperCase()}</span>
          </div>
        </div>

        <p className="text-stone-500 text-sm italic">
          *This is a preliminary estimate. {company.name} will contact you shortly to confirm details and schedule a site visit.
        </p>
      </div>
    );
  }

  const primaryColor = company.primary_color || '#059669';

  return (
    <div className="max-w-2xl mx-auto mt-8 px-4 pb-20">
      <style>{`
        .btn-primary { background-color: ${primaryColor}; }
        .btn-primary:hover { filter: brightness(0.9); }
        .text-primary { color: ${primaryColor}; }
        .bg-primary-light { background-color: ${primaryColor}15; }
        .border-primary { border-color: ${primaryColor}; }
        .accent-primary { accent-color: ${primaryColor}; }
        .focus-ring-primary:focus { --tw-ring-color: ${primaryColor}; }
      `}</style>

      <div className="mb-8 text-center">
        {company.logo_url ? (
          <img 
            src={company.logo_url} 
            alt={company.name} 
            className="h-16 mx-auto mb-4 object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TreeDeciduous className="w-8 h-8 text-stone-400" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-stone-900">{company.name}</h1>
        <p className="text-stone-500 font-medium">TreeQuote Pro - Instant Tree Removal Estimator</p>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? '' : 'bg-stone-200'}`} 
            style={step >= i ? { backgroundColor: primaryColor } : {}}
          />
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <TreeDeciduous className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-stone-900">Tree Basics</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Tree Species</label>
                  <select 
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus-ring-primary outline-none"
                    value={formData.species}
                    onChange={e => setFormData({...formData, species: e.target.value})}
                  >
                    <option>Oak</option>
                    <option>Pine</option>
                    <option>Maple</option>
                    <option>Birch</option>
                    <option>Palm</option>
                    <option>Other / Unknown</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-stone-700">Estimated Height</label>
                    <span className="text-primary font-bold">{formData.height} ft</span>
                  </div>
                  <input 
                    type="range" min="10" max="120" step="5"
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    value={formData.height}
                    onChange={e => setFormData({...formData, height: parseInt(e.target.value)})}
                  />
                  <div className="flex justify-between text-xs text-stone-400 mt-1">
                    <span>Small (10ft)</span>
                    <span>Massive (120ft+)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Trunk Diameter (Inches)</label>
                  <input 
                    type="number" 
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus-ring-primary outline-none"
                    placeholder="Approx. width at chest height"
                    value={formData.diameter}
                    onChange={e => setFormData({...formData, diameter: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <button 
                onClick={handleNext}
                className="w-full mt-8 btn-primary text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-stone-200"
              >
                Next Step <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-bold text-stone-900">Hazard Factors</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-3">Proximity to Structures</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'clear', label: 'Clear Area', icon: TreeDeciduous },
                      { id: 'near-house', label: 'Near House', icon: Home },
                      { id: 'power-lines', label: 'Power Lines', icon: Zap },
                      { id: 'fence', label: 'Near Fence', icon: ShieldAlert },
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => setFormData({...formData, proximity: item.id})}
                        className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${formData.proximity === item.id ? 'border-primary bg-primary-light' : 'bg-stone-50 border-stone-200 text-stone-600'}`}
                        style={formData.proximity === item.id ? { borderColor: primaryColor, color: primaryColor } : {}}
                      >
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs font-bold uppercase tracking-tighter">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Tree Condition</label>
                  <select 
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus-ring-primary outline-none"
                    value={formData.condition}
                    onChange={e => setFormData({...formData, condition: e.target.value})}
                  >
                    <option value="healthy">Healthy & Stable</option>
                    <option value="leaning">Leaning / Root Issues</option>
                    <option value="dead-decaying">Dead / Decaying (Hazardous)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Accessibility</label>
                  <select 
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus-ring-primary outline-none"
                    value={formData.access}
                    onChange={e => setFormData({...formData, access: e.target.value})}
                  >
                    <option value="truck">Bucket Truck Access</option>
                    <option value="gate">Small Gate Only</option>
                    <option value="manual-climb">Manual Climb Only (No Truck)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={handleBack} className="flex-1 border border-stone-200 p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors">
                  <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button onClick={handleNext} className="flex-[2] btn-primary text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-stone-200">
                  Next Step <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <Camera className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-stone-900">Photo Upload</h2>
              </div>

              <p className="text-stone-500 text-sm mb-6">
                Photos help us provide a more accurate estimate. Please upload up to 5 clear shots.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-stone-200">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {selectedFiles.length < 5 && (
                  <>
                    <label className="border-2 border-dashed border-stone-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors cursor-pointer bg-stone-50 aspect-square group">
                      <Camera className="w-6 h-6 text-stone-300 group-hover:text-primary transition-colors" />
                      <span className="text-[9px] font-bold uppercase text-stone-500">Gallery</span>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                    </label>
                    <label 
                      className="border-2 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors cursor-pointer aspect-square group bg-primary-light"
                      style={{ borderColor: `${primaryColor}30` }}
                    >
                      <Camera className="w-6 h-6 group-hover:scale-110 transition-transform text-primary" />
                      <span className="text-[9px] font-bold uppercase text-primary">Camera</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="mt-6 p-4 bg-stone-100 rounded-xl text-xs text-stone-500 italic">
                {selectedFiles.length > 0 ? `${selectedFiles.length} photos selected.` : "No photos selected yet."}
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={handleBack} className="flex-1 border border-stone-200 p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors">
                  <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button onClick={handleNext} className="flex-[2] btn-primary text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-stone-200">
                  Next Step <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-stone-900">Lead Capture</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus-ring-primary outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone</label>
                    <input 
                      required
                      type="tel" 
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus-ring-primary outline-none"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email Address</label>
                  <input 
                    required
                    type="email" 
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus-ring-primary outline-none"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Property Address</label>
                  <div className="relative">
                    <input 
                      required
                      type="text" 
                      placeholder="Start typing your address..."
                      className={`w-full p-3 bg-stone-50 border rounded-xl focus:ring-2 focus-ring-primary outline-none transition-all ${isAddressValid ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'}`}
                      value={formData.address}
                      onChange={e => {
                        setFormData({...formData, address: e.target.value});
                        setIsAddressValid(false);
                      }}
                    />
                    <div className="absolute right-3 top-3">
                      {isSearchingAddress ? (
                        <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
                      ) : isAddressValid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <MapPin className="w-5 h-5 text-stone-300" />
                      )}
                    </div>

                    {addressSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden">
                        {addressSuggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => selectAddress(s)}
                            className="w-full text-left p-3 text-sm hover:bg-stone-50 border-b border-stone-100 last:border-0 flex items-start gap-2"
                          >
                            <MapPin className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
                            <span>{s.display_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {mapCenter && (
                    <div className="mt-4 h-48 rounded-2xl overflow-hidden border border-stone-200 shadow-inner relative z-0">
                      <MapContainer 
                        center={mapCenter} 
                        zoom={16} 
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                        zoomControl={false}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; OpenStreetMap contributors'
                        />
                        <Marker position={mapCenter} />
                        <MapUpdater center={mapCenter} />
                      </MapContainer>
                      <div className="absolute bottom-2 left-2 z-[1000] bg-white/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-stone-500 border border-stone-200">
                        Location Confirmed
                      </div>
                    </div>
                  )}
                  {!isAddressValid && formData.address.length > 10 && !isSearchingAddress && addressSuggestions.length === 0 && (
                    <p className="text-[10px] text-stone-400 mt-1 font-medium italic">Address not found in map? You can still proceed with this address.</p>
                  )}
                </div>

                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={handleBack} className="flex-1 border border-stone-200 p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors">
                    <ArrowLeft className="w-5 h-5" /> Back
                  </button>
                  <button 
                    type="submit" 
                    disabled={uploading || formData.address.length < 5}
                    className="flex-[2] btn-primary text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-stone-200"
                  >
                    {uploading ? "Uploading..." : <><CheckCircle2 className="w-5 h-5" /> Get My Instant Quote</>}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-xs text-stone-400 font-medium">
          <span className="text-stone-500 font-bold">TreeQuote Pro</span> | powered by PBT Digital Services
        </p>
      </div>
    </div>
  );
}
