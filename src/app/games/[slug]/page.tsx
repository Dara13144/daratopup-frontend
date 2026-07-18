'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import GameIcon from '../../../components/GameIcon';
import { fetchProduct, lookupNickname, createOrder, GameProduct, GamePackage, API_BASE } from '../../../lib/api';
import { Gamepad2, ArrowLeft, ShieldAlert, CheckCircle, CreditCard, ShoppingCart, ShieldCheck, Gem, X, Layers } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../../../lib/LanguageContext';

// --- PREMIUM SVG GRAPHICS FOR RECHARGE PACKAGES ---
const DiamondPileIcon = () => (
  <svg className="h-9 w-11 text-cyan-400 shrink-0" viewBox="0 0 48 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 6L34 16L24 26L14 16L24 6Z" fill="url(#gemGrad)" stroke="#22d3ee" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M12 18L18 24L12 30L6 24L12 18Z" fill="url(#gemGrad)" stroke="#22d3ee" strokeWidth="1.2" strokeLinejoin="round" opacity="0.8"/>
    <path d="M36 18L42 24L36 30L30 24L36 18Z" fill="url(#gemGrad)" stroke="#22d3ee" strokeWidth="1.2" strokeLinejoin="round" opacity="0.8"/>
    <defs>
      <linearGradient id="gemGrad" x1="24" y1="6" x2="24" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#06b6d4" stopOpacity="0.4"/>
        <stop stopColor="#3b82f6" stopOpacity="0.8"/>
      </linearGradient>
    </defs>
  </svg>
);

const EvoCardIcon = ({ days }: { days: string }) => (
  <div className="relative flex items-center justify-center shrink-0">
    <svg className="h-9 w-12 text-rose-500" viewBox="0 0 56 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="52" height="32" rx="6" fill="url(#cardGrad)" stroke="#f43f5e" strokeWidth="1.5"/>
      <path d="M8 8H24V14H8V8Z" fill="#fda4af" opacity="0.3"/>
      <path d="M8 20H48V22H8V20Z" fill="#f43f5e" opacity="0.5"/>
      <defs>
        <linearGradient id="cardGrad" x1="28" y1="2" x2="28" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e11d48"/>
          <stop stopColor="#4c0519"/>
        </linearGradient>
      </defs>
    </svg>
    <span className="absolute text-[7px] font-black text-rose-100 tracking-wider font-sans select-none">{days}</span>
  </div>
);

const PassChestIcon = ({ type }: { type: string }) => (
  <div className="relative flex items-center justify-center shrink-0">
    <svg className="h-9 w-11 text-amber-500" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 14H42V32H6V14Z" fill="url(#chestGrad)" stroke="#f59e0b" strokeWidth="1.5"/>
      <path d="M4 14C4 10 8 8 24 8C40 8 44 10 44 14H4Z" fill="url(#lidGrad)" stroke="#f59e0b" strokeWidth="1.5"/>
      <circle cx="24" cy="18" r="3" fill="#fef08a" stroke="#d97706" strokeWidth="1"/>
      <defs>
        <linearGradient id="chestGrad" x1="24" y1="14" x2="24" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b45309"/>
          <stop stopColor="#f59e0b" stopOpacity="0.8"/>
        </linearGradient>
        <linearGradient id="lidGrad" x1="24" y1="8" x2="24" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b"/>
          <stop stopColor="#78350f"/>
        </linearGradient>
      </defs>
    </svg>
    <span className="absolute -bottom-1 right-0 text-[6px] font-extrabold bg-slate-950 border border-slate-900 text-amber-400 px-1 py-0.2 rounded-md scale-90">{type}</span>
  </div>
);

const getPackageIcon = (name: string) => {
  const norm = name.toLowerCase();
  if (norm.includes('evo3d') || norm.includes('3d') || norm.includes('3 day')) return <EvoCardIcon days="3 DAY" />;
  if (norm.includes('evo7d') || norm.includes('7d') || norm.includes('7 day')) return <EvoCardIcon days="7 DAY" />;
  if (norm.includes('evo30d') || norm.includes('30d') || norm.includes('30 day')) return <EvoCardIcon days="30 DAY" />;
  if (norm.includes('weeklylite') || norm.includes('weekly-lite')) return <PassChestIcon type="LITE" />;
  if (norm.includes('weekly')) return <PassChestIcon type="WEEK" />;
  if (norm.includes('monthly')) return <PassChestIcon type="MONTH" />;
  if (norm.includes('pass')) return <PassChestIcon type="PASS" />;
  return <DiamondPileIcon />;
};

export default function GameDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [product, setProduct] = useState<GameProduct | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<GamePackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'ABA' | 'BAKONG' | 'CANADIA'>('BAKONG');
  const { t } = useLanguage();
  
  // Player credentials inputs
  const [playerId, setPlayerId] = useState('');
  const [playerZoneId, setPlayerZoneId] = useState('');
  const [nickname, setNickname] = useState('');
  const [lastValidNickname, setLastValidNickname] = useState(''); // Persists even after re-typing
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupSuccess, setLookupSuccess] = useState(false);

  // Form states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // Custom KHQR payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  // Unwrap params using React.use() or useEffect
  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  // Polling logic for popup modal payment confirmation
  useEffect(() => {
    let intervalId: any = null;
    if (showPaymentModal && activeOrder) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/orders/status/${activeOrder.paymentTxnId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'SUCCESS' || data.status === 'COMPLETED') {
              clearInterval(intervalId);
              // Redirect directly to details on success
              router.push(`/orders/${activeOrder.paymentTxnId}`);
            }
          }
        } catch (err) {
          console.error('Modal verification polling error:', err);
        }
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showPaymentModal, activeOrder, router]);

  useEffect(() => {
    if (!slug) return;

    fetchProduct(slug)
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch product detail error:', err);
        setError(`Failed to fetch game top-up configurations from "${API_BASE}". Details: ${err.message || err}`);
        setLoading(false);
      });
  }, [slug]);
  const handleLookup = async () => {
    if (!playerId) {
      setLookupError(t.nicknameRequired);
      return;
    }
    const isMLBB = slug === 'mobile-legends' || slug.startsWith('mobile-legends-');
    if (isMLBB && !playerZoneId) {
      setLookupError(t.zoneIdRequired);
      return;
    }

    setLookupError('');
    setLookupSuccess(false);
    setLookupLoading(true);

    try {
      const fetchedNickname = await lookupNickname(slug, playerId, playerZoneId);
      setNickname(fetchedNickname);
      setLastValidNickname(fetchedNickname);
      setLookupSuccess(true);
    } catch (err: any) {
      console.error(err);
      setLookupError(err.message || 'Nickname lookup failed. Please verify Player ID.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Auto-verify Player ID after typing pauses (800ms debounce)
  useEffect(() => {
    if (!playerId.trim()) {
      setNickname('');
      setLookupError('');
      setLookupSuccess(false);
      return;
    }

    const isMLBB = slug === 'mobile-legends' || slug.startsWith('mobile-legends-');
    if (isMLBB && !playerZoneId.trim()) {
      return;
    }

    // Validation checks to prevent premature queries while typing
    if (slug === 'free-fire' || slug.startsWith('free-fire-')) {
      if (!/^\d{5,12}$/.test(playerId.trim())) return;
    } else if (slug === 'pubg-mobile') {
      if (!/^\d{5,15}$/.test(playerId.trim())) return;
    } else if (slug === 'valorant') {
      if (!playerId.includes('#') || playerId.trim().length < 5) return;
    } else if (isMLBB) {
      if (!/^\d{3,10}$/.test(playerId.trim()) || !/^\d{3,10}$/.test(playerZoneId.trim())) return;
    } else {
      if (playerId.trim().length < 3) return;
    }

    const timer = setTimeout(() => {
      handleLookup();
    }, 800);

    return () => clearTimeout(timer);
  }, [playerId, playerZoneId, slug]);

  const handleOrderSubmit = async () => {
    if (!playerId) {
      setError(t.nicknameRequired);
      return;
    }
    const isMLBB = slug === 'mobile-legends' || slug.startsWith('mobile-legends-');
    if (isMLBB && !playerZoneId) {
      setError(t.zoneIdRequired);
      return;
    }
    if (!selectedPackage) {
      setError('Please select a top-up package');
      return;
    }

    const isValidationNeeded = slug === 'free-fire' || slug.startsWith('free-fire-') || isMLBB || slug === 'pubg-mobile' || slug === 'valorant' || slug === 'blood-strike' || slug === 'honor-of-kings' || slug === 'farlight-84' || slug === 'delta-force';
    if (isValidationNeeded && !lookupSuccess) {
      setError('Please validate your Player ID/Nickname before placing order');
      return;
    }

    setError('');
    setOrderSubmitting(true);

    try {
      const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') || undefined : undefined;
      const res = await createOrder(
        selectedPackage.id,
        playerId,
        playerZoneId || null,
        paymentMethod,
        email
      );
      
      // Redirect directly to the interactive checkout invoice page
      router.push(`/orders/${res.order.paymentTxnId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit top-up request.');
      setOrderSubmitting(false);
    }
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    if (activeOrder) {
      router.push(`/orders/${activeOrder.paymentTxnId}`);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 text-sm">Loading game modules...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <div className="flex-grow max-w-md w-full mx-auto flex flex-col justify-center py-16 px-4">
          <div className="glass-panel p-8 text-center bg-slate-950 border-slate-900">
            <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-white font-extrabold text-lg mb-2">Game Not Found</h3>
            <p className="text-slate-400 text-sm mb-6">
              The game configuration you requested does not exist or has been disabled.
            </p>
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to games</span>
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-cyan-400 text-xs font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t.backToHome}</span>
        </Link>

        {/* Game Intro Banner Card */}
        <div className="glass-panel p-6 sm:p-8 bg-gradient-to-r from-slate-950 to-slate-900 border-slate-900 mb-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="shrink-0">
            <GameIcon slug={product.slug} className="h-20 w-20" />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{product.name}</h1>
            <p className="text-slate-400 text-xs mt-1">
              {t.category}: <span className="text-slate-200 uppercase font-semibold">{product.category.replace('_', ' ')}</span>
              {' '} • {t.instantDelivery}
            </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1 & 2: Steps Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* STEP 1: Enter Player ID */}
            <div className="glass-panel p-6 bg-slate-950/40 border-slate-900">
              <div className="flex items-center space-x-2 mb-4">
                <span className="h-6 w-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                  1
                </span>
                <h3 className="text-white font-bold text-base">{t.enterAccountDetails}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1.5">
                    {t.playerId}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.playerId}
                    value={playerId}
                    onChange={(e) => {
                      setPlayerId(e.target.value);
                      setLookupSuccess(false); // Reset validation status but keep last nickname visible
                    }}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-900 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {(product.slug === 'mobile-legends' || product.slug.startsWith('mobile-legends-')) && (
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1.5">
                      {t.zoneId}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1234"
                      value={playerZoneId}
                      onChange={(e) => {
                        setPlayerZoneId(e.target.value);
                        setLookupSuccess(false);
                      }}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-900 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                )}
              </div>

              {/* Verify Nickname button & status indicator */}
              {(product.slug === 'free-fire' || product.slug.startsWith('free-fire-') || product.slug === 'mobile-legends' || product.slug.startsWith('mobile-legends-') || product.slug === 'pubg-mobile' || product.slug === 'valorant' || product.slug === 'blood-strike' || product.slug === 'honor-of-kings' || product.slug === 'farlight-84' || product.slug === 'delta-force') && (
                <div className="mt-4 pt-4 border-t border-slate-900/60 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={lookupLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all"
                  >
                    {lookupLoading ? `${t.verifying}...` : 'ផ្ទៀងផ្ទាត់ឈ្មោះអ្នកលេង'}
                  </button>

                  {lookupSuccess && nickname && (
                    <div className="flex items-center space-x-2 bg-emerald-950/30 border border-emerald-500/30 rounded-lg px-3 py-1.5">
                      <CheckCircle className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-wider">បានបញ្ជាក់</span>
                        <strong className="text-white font-black text-xs">{nickname}</strong>
                      </div>
                    </div>
                  )}

                  {lookupError && !lookupLoading && (
                    <span className="text-red-400 text-xs font-semibold">
                      ⚠️ {lookupError}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* STEP 2: Select Package */}
            <div className="glass-panel p-6 bg-slate-950/40 border-slate-900">
              <div className="flex items-center space-x-2 mb-6">
                <span className="h-6 w-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                  2
                </span>
                <h3 className="text-white font-bold text-base">{t.selectRechargePackage}</h3>
              </div>

              {/* Best Seller Section */}
              {product.packages.filter(p => p.category === 'BEST_SELLER').length > 0 && (
                <div className="mb-6">
                  <h4 className="text-[#f59e0b] font-black text-xs uppercase tracking-wider mb-3.5 flex items-center gap-1.5 select-none">
                    <span className="animate-pulse">🔥</span> Best Seller Package
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {product.packages
                      .filter(p => p.category === 'BEST_SELLER')
                      .map((pkg) => {
                        const isSelected = selectedPackage?.id === pkg.id;
                        return (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => setSelectedPackage(pkg)}
                            className={`p-3.5 rounded-2xl text-left border relative overflow-hidden transition-all flex flex-col justify-between h-24 ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/5 shadow-lg scale-[1.01]'
                                : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-md'
                            }`}
                          >
                            {pkg.badge && (
                              <span className="absolute top-0 right-0 z-10 text-[7.5px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded-bl-lg uppercase shadow-sm tracking-wide">
                                {pkg.badge}
                              </span>
                            )}

                            <div className="flex items-start justify-between gap-1 w-full text-left">
                              <div className="font-extrabold text-slate-800 text-[11px] sm:text-xs line-clamp-2 leading-tight pr-2">
                                {pkg.name}
                              </div>
                              <div className="shrink-0 scale-95 translate-y-0.5">
                                {(pkg as any).image ? (
                                  <img
                                    src={(pkg as any).image.startsWith('/uploads') ? `${API_BASE}${(pkg as any).image}` : (pkg as any).image}
                                    alt={pkg.name}
                                    onError={e=>{(e.target as HTMLImageElement).style.display='none';}}
                                    className="h-10 w-10 object-cover rounded-lg shadow-sm"
                                  />
                                ) : getPackageIcon(pkg.name)}
                              </div>
                            </div>

                            <div className="text-[#03c39a] font-black text-xs sm:text-sm mt-2.5 flex justify-between items-end">
                              <span>${pkg.price.toFixed(2)}</span>
                              {isSelected && (
                                <span className="text-[8px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded-md scale-90 select-none">
                                  {t.selectedBadge}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Normal Section */}
              {product.packages.filter(p => p.category !== 'BEST_SELLER').length > 0 && (
                <div>
                  <h4 className="text-cyan-400 font-black text-xs uppercase tracking-wider mb-3.5 flex items-center gap-1.5 select-none">
                    <Layers className="h-3.5 w-3.5" />
                    <span>Normal package</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {product.packages
                      .filter(p => p.category !== 'BEST_SELLER')
                      .map((pkg) => {
                        const isSelected = selectedPackage?.id === pkg.id;
                        return (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => setSelectedPackage(pkg)}
                            className={`p-3.5 rounded-2xl text-left border relative overflow-hidden transition-all flex flex-col justify-between h-24 ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/5 shadow-lg scale-[1.01]'
                                : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-md'
                            }`}
                          >
                            {pkg.badge && (
                              <span className="absolute top-0 right-0 z-10 text-[7.5px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded-bl-lg uppercase shadow-sm tracking-wide">
                                {pkg.badge}
                              </span>
                            )}

                            <div className="flex items-start justify-between gap-1 w-full text-left">
                              <div className="font-extrabold text-slate-800 text-[11px] sm:text-xs line-clamp-2 leading-tight pr-2">
                                {pkg.name}
                              </div>
                              <div className="shrink-0 scale-95 translate-y-0.5">
                                {(pkg as any).image ? (
                                  <img
                                    src={(pkg as any).image.startsWith('/uploads') ? `${API_BASE}${(pkg as any).image}` : (pkg as any).image}
                                    alt={pkg.name}
                                    onError={e=>{(e.target as HTMLImageElement).style.display='none';}}
                                    className="h-10 w-10 object-cover rounded-lg shadow-sm"
                                  />
                                ) : getPackageIcon(pkg.name)}
                              </div>
                            </div>

                            <div className="text-[#03c39a] font-black text-xs sm:text-sm mt-2.5 flex justify-between items-end">
                              <span>${pkg.price.toFixed(2)}</span>
                              {isSelected && (
                                <span className="text-[8px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded-md scale-90 select-none">
                                  {t.selectedBadge}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: Choose Payment Gateway */}
            <div className="glass-panel p-6 bg-slate-950/40 border-slate-900">
              <div className="flex items-center space-x-2 mb-4">
                <span className="h-6 w-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                  3
                </span>
                <h3 className="text-white font-bold text-base">{t.choosePaymentGateway}</h3>
              </div>

              <div className="grid grid-cols-1 max-w-sm gap-4">
                {/* Bakong KHQR */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BAKONG')}
                  className="p-4 rounded-xl border border-violet-500 bg-violet-950/10 flex items-center space-x-4 transition-all text-left w-full cursor-default"
                >
                  <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0">
                    <img
                      src="/images/payments/bakong.png"
                      alt="Bakong KHQR"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Bakong KHQR</h4>
                    <span className="text-slate-400 text-[10px] leading-tight block mt-0.5">{t.bakongDesc}</span>
                  </div>
                </button>
              </div>
            </div>

          </div>

          {/* Column 3: Summary Sidebar */}
          <div className="space-y-6">
            <div className="glass-panel p-6 bg-slate-950/70 border-slate-900 sticky top-24">
              <h3 className="text-white font-extrabold text-base border-b border-slate-900 pb-3 mb-4 flex items-center space-x-2">
                <ShoppingCart className="h-4.5 w-4.5 text-cyan-400" />
                <span>{t.orderSummary}</span>
              </h3>

              {/* Order Items list details */}
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.selectedProduct}:</span>
                  <span className="text-white font-bold">{product.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.packageItem}:</span>
                  <span className="text-white font-semibold">{selectedPackage ? selectedPackage.name : 'Not selected'}</span>
                </div>



                {playerId && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.playerIdDetails}:</span>
                    <span className="text-white font-mono">
                      {playerId} {playerZoneId ? `(${playerZoneId})` : ''}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-400">{t.paymentGateway}:</span>
                  <span className="text-white font-bold">{paymentMethod}</span>
                </div>

                <div className="border-t border-slate-900 pt-3 flex justify-between items-end">
                  <span className="text-slate-400 text-sm">{t.totalPriceUsd}:</span>
                  <span className="text-cyan-400 text-xl font-black">
                    ${selectedPackage ? selectedPackage.price.toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>

              {/* Global Error Banner */}
              {error && (
                <div className="mt-4 p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-red-300 text-[11px] leading-relaxed">
                  {error}
                </div>
              )}

              {/* Action Submit Checkout */}
              <button
                type="button"
                onClick={handleOrderSubmit}
                disabled={orderSubmitting}
                className="w-full mt-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white font-black text-sm shadow-md transition-all duration-300 glow-btn disabled:opacity-50"
              >
                {orderSubmitting ? t.generatingInvoice : t.purchaseTopUp}
              </button>

              <div className="mt-4 text-center text-[10px] text-slate-500 leading-normal">
                {t.purchaseDisclaimer}
              </div>

              {/* 100% Security Badge */}
              <div className="mt-4 p-3 bg-emerald-950/10 border border-emerald-500/20 rounded-xl flex items-center space-x-3 text-left">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider">សន្តិសុខសុវត្ថិភាព 100% / 100% Secure</h4>
                  <p className="text-slate-400 text-[10px] leading-tight mt-0.5">
                    រាល់ការទូទាត់ត្រូវបានការពារ និងធានាសុវត្ថិភាព 100% តាមប្រព័ន្ធធនាគារផ្លូវការ។
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
