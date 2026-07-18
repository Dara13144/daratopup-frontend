'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GameIcon from '../components/GameIcon';
import { fetchProducts, GameProduct, API_BASE } from '../lib/api';
import { Search, AlertCircle, Gamepad2, ArrowRight } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import Image from 'next/image';

export default function Home() {
  const [products, setProducts] = useState<GameProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const { t } = useLanguage();

  useEffect(() => {
    fetchProducts()
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch products error:', err);
        setError(`Could not connect to the top-up server API at "${API_BASE}". Details: ${err.message || err}`);
        setLoading(false);
      });
  }, []);

  const categories = [
    { label: t.allProducts, value: 'ALL' },
    { label: t.mobileGames, value: 'MOBILE_GAME' },
    { label: t.pcGames, value: 'PC_GAME' },
    { label: t.vouchers, value: 'VOUCHER' },
  ];

  // Filtering products
  const filteredProducts = products.filter((prod) => {
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || prod.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Header />
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Hero Section — DaraTopup banner image */}
        <div className="relative w-full rounded-2xl overflow-hidden mb-10 shadow-2xl shadow-slate-950/50">
          <Image
            src="/images/daratopup-banner.jpg"
            alt="DaraTopup - Top Up Game Favorit Tanpa Ribet"
            width={1200}
            height={400}
            className="w-full h-auto object-cover"
            priority
            unoptimized
          />
        </div>



        {/* Error notification display */}
        {error && (
          <div className="flex items-start space-x-3 bg-red-950/20 border border-red-900/30 rounded-xl p-4 mb-8 text-red-300 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold mb-1">{t.serverIssueTitle}</h4>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Main grid catalog with special styling */}
        <div className="bg-[#0f766e]/20 border border-[#115e59]/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-950/40 mb-12">
          <h2 className="text-white font-black text-lg sm:text-xl uppercase tracking-wider mb-6 border-b border-[#115e59]/30 pb-3 flex items-center space-x-2.5">
            <span className="h-2 w-2 rounded-full bg-[#03c39a] shadow-[0_0_8px_#03c39a]"></span>
            <span>CHOOSE SPECIAL GAMES</span>
          </h2>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="glass-panel h-64 animate-pulse bg-slate-900/40 border-slate-900 rounded-2xl"></div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-slate-950/20 border border-slate-900 rounded-2xl">
              <Gamepad2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg mb-1">{t.noProductsFound}</h3>
              <p className="text-slate-400 text-sm">{t.trySearchingElse}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {filteredProducts.map((product) => {
                // Parse flag and tags based on name conventions
                let flagUrl = '';
                let cornerTag = '';
                const upperName = product.name.toUpperCase();
                
                if (upperName.includes('KHMER')) {
                  flagUrl = 'https://flagcdn.com/w80/kh.png';
                  cornerTag = 'Khmer';
                } else if (upperName.includes('PHILIPPINES')) {
                  flagUrl = 'https://flagcdn.com/w80/ph.png';
                  cornerTag = 'Ph';
                } else if (upperName.includes('INDONESIA')) {
                  flagUrl = 'https://flagcdn.com/w80/id.png';
                  cornerTag = 'Indo';
                } else if (upperName.includes('VIETNAM')) {
                  flagUrl = 'https://flagcdn.com/w80/vn.png';
                  cornerTag = 'Viet';
                } else if (upperName.includes('TAIWAN')) {
                  flagUrl = 'https://flagcdn.com/w80/tw.png';
                  cornerTag = 'Taiwan';
                }

                const isOutOfStock = !product.isActive || product.packages.length === 0;
                const delayClass = `delay-${(products.indexOf(product) % 5) + 1}`;

                return (
                  <Link
                    key={product.id}
                    href={isOutOfStock ? '#' : `/games/${product.slug}`}
                    className={`group relative overflow-hidden flex flex-col h-full bg-slate-950/50 border border-slate-900 rounded-2xl p-2.5 transition-all duration-300 animate-fade-in-up ${delayClass} ${
                      isOutOfStock 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-950/20 hover:-translate-y-0.5'
                    }`}
                    onClick={(e) => {
                      if (isOutOfStock) e.preventDefault();
                    }}
                  >
                    {/* Game Card image container */}
                    <div className="relative aspect-square w-full bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-900 mb-3">
                      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 to-slate-900 group-hover:scale-110 transition-transform duration-500"></div>
                      
                      {/* Standard game icon */}
                      <div className="relative z-10 transition-transform duration-300 group-hover:scale-105">
                        <GameIcon slug={product.slug} className="h-14 w-14" />
                      </div>

                      {/* Top Left Corner Country text Label */}
                      {cornerTag && (
                        <span className="absolute top-2 left-2 z-20 text-[9px] font-black uppercase bg-red-600 text-white px-1.5 py-0.5 rounded shadow">
                          {cornerTag}
                        </span>
                      )}

                      {/* Top Right cartoon avatar badge (Dicebear) */}
                      <div className="absolute top-2 right-2 z-20 h-7 w-7 rounded-full overflow-hidden border border-slate-800 bg-slate-950 shadow">
                        <img 
                          src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${product.slug}`} 
                          alt="avatar" 
                          className="w-full h-full object-cover" 
                        />
                      </div>

                      {/* Center Overlay flag image */}
                      {flagUrl && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 shadow-lg border border-slate-800 rounded overflow-hidden w-11 h-7">
                          <img 
                            src={flagUrl} 
                            alt={`${product.name} flag`} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      )}
                    </div>

                    {/* Game Name (centered, uppercase) */}
                    <h3 className="text-white font-extrabold text-[11px] sm:text-xs text-center uppercase tracking-wide line-clamp-2 mb-3 min-h-[32px] flex items-center justify-center">
                      {product.name}
                    </h3>

                    {/* Action Button */}
                    <div className="mt-auto">
                      {isOutOfStock ? (
                        <div className="w-full py-1.5 text-center text-[10px] font-bold text-slate-500 bg-slate-900 rounded-lg select-none border border-slate-800">
                          Out of stock
                        </div>
                      ) : (
                        <div className="w-full py-1.5 text-center text-[10px] font-black uppercase text-slate-950 bg-[#03c39a] group-hover:bg-[#02b18b] rounded-lg transition-colors select-none shadow">
                          Top up
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
