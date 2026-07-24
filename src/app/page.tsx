'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, MessageSquare, Terminal, Globe, Cpu, Check, ShoppingCart, ArrowRight, X, Gift, Sparkles, Loader2, RefreshCw, Search } from 'lucide-react';
import NeoCard from '@/components/NeoCard';
import InfiniteMarquee from '@/components/InfiniteMarquee';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Telegram Bot' | 'Discord Bot' | 'Web Development' | 'Software Tool' | 'Digital Product';
  features: string[];
  deliveryTime: string;
  stockAccounts?: string[];
  image?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [customerEmail, setCustomerEmail] = useState('');
  const [requirements, setRequirements] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Animated Checkout Progress & Unboxing
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discount: number} | null>(null);
  const [couponError, setCouponError] = useState('');

  // Real KHQR Payment State
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [paymentStatusText, setPaymentStatusText] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(180);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>(['All', 'Telegram Bot', 'Discord Bot', 'Web Development', 'Software Tool', 'Digital Product']);
  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Customer Session authentication force
  const [session, setSession] = useState<{ email: string; role: string } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch dynamic categories
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(['All', ...data]);
        }
      })
      .catch(err => console.error('Fetch categories error:', err));

    // Load initial user session if present
    const stored = localStorage.getItem('user_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      setSession(parsed);
      setCustomerEmail(parsed.email);
    }

    const handleSessionChange = () => {
      const current = localStorage.getItem('user_session');
      if (current) {
        const parsed = JSON.parse(current);
        setSession(parsed);
        setCustomerEmail(parsed.email);
      } else {
        setSession(null);
        setCustomerEmail('');
      }
    };
    window.addEventListener('session_changed', handleSessionChange);

    return () => {
      window.removeEventListener('session_changed', handleSessionChange);
    };
  }, []);

  // Handle countdown timer for QR code expiration
  useEffect(() => {
    if (qrCodeUrl && secondsLeft > 0) {
      countdownTimerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            clearInterval(pollTimerRef.current!);
            setQrCodeUrl('');
            setCheckoutStatus({ success: false, message: 'QR Code Expired. Please try again.' });
            setIsProcessing(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [qrCodeUrl, secondsLeft]);

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail || !selectedProduct) return;

    setIsProcessing(true);
    setProgress(0);
    setCheckoutStatus(null);
    setQrCodeUrl('');
    setSecondsLeft(180);

    const finalAmount = appliedCoupon 
      ? (selectedProduct.price * (1 - appliedCoupon.discount / 100)).toFixed(2)
      : selectedProduct.price.toFixed(2);

    // 1. Animate sloshing tube setup progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // hold at 90% while calling payment creator API
        }
        return prev + 10;
      });
    }, 80);

    // 2. Call real create-qr payment API
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          amount: finalAmount
        })
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) {
        throw new Error('Payment gateway error');
      }

      const paymentData = await res.json();

      if (paymentData.status?.code === '00') {
        // Set real QR details
        setQrCodeUrl(paymentData.download_qr);
        setPaymentStatusText('Scan KHQR using ABA or any bank app to pay...');

        // Start polling payment status every 3 seconds
        pollTimerRef.current = setInterval(async () => {
          try {
            const checkRes = await fetch('/api/payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'check',
                tran_id: paymentData.status.tran_id,
                client_id: paymentData.client_id
              })
            });

            if (checkRes.ok) {
              const statusData = await checkRes.json();
              
              // Only treat as Approved if it has meta.payment_approved true or explicit Approved text
              const isApproved = statusData.meta?.payment_approved === true ||
                                 statusData.meta?.finished === true ||
                                 statusData.data?.message?.message === 'Approved';
              
              // Only treat as Scanned if meta.qr_scanned is true or message contains Scan
              const isScanned = statusData.meta?.qr_scanned === true || 
                                statusData.data?.message?.message === 'Scan' ||
                                (statusData.data?.message?.message && 
                                 statusData.data.message.message.toLowerCase().includes('scan'));

              if (isApproved) {
                // Stop polling and countdown
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                
                setPaymentStatusText('Payment Approved! Saving order...');
                
                // Submit final order to orders DB and trigger vault unboxing success screen
                await registerPaidOrder();
              } else if (isScanned) {
                setPaymentStatusText('QR Scanned! Waiting for mobile authorization...');
              }
            }
          } catch (err) {
            console.error('Check status error:', err);
          }
        }, 3000);

      } else {
        setCheckoutStatus({ success: false, message: paymentData.status?.message || 'Payment initiation failed.' });
        setIsProcessing(false);
      }
    } catch (err) {
      setCheckoutStatus({ success: false, message: 'Server connection error. Payment failed.' });
      setIsProcessing(false);
    }
  };

  // Helper to save order details in database after payment approves
  const registerPaidOrder = async () => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail,
          productId: selectedProduct!.id,
          productName: selectedProduct!.name,
          price: appliedCoupon ? (selectedProduct!.price * (1 - appliedCoupon.discount / 100)) : selectedProduct!.price,
          requirements
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPlacedOrder(data);
        setCheckoutStatus({ success: true, message: `Order placed successfully!` });
        
        // Save customer session in localStorage and dispatch event to update Navbar
        localStorage.setItem('user_session', JSON.stringify({ email: customerEmail, role: 'customer' }));
        window.dispatchEvent(new Event('session_changed'));
      } else {
        setCheckoutStatus({ success: false, message: data.error || 'Failed to register order details.' });
        setIsProcessing(false);
      }
    } catch {
      setCheckoutStatus({ success: false, message: 'Error registering purchase in database.' });
      setIsProcessing(false);
    }
  };

  const resetCheckout = () => {
    // Clear all intervals
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    setSelectedProduct(null);
    setCheckoutStatus(null);
    setCustomerEmail(session?.email || '');
    setRequirements('');
    setIsProcessing(false);
    setProgress(0);
    setPlacedOrder(null);
    setQrCodeUrl('');
    setSecondsLeft(180);
    setPasswordInput('');
  };

  const handleCheckoutAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail || !customerEmail.includes('@')) {
      setCheckoutStatus({ success: false, message: 'Please enter a valid email address.' });
      return;
    }
    if (!passwordInput || passwordInput.length < 4) {
      setCheckoutStatus({ success: false, message: 'Password must be at least 4 characters.' });
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          email: customerEmail,
          password: passwordInput
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const newSession = { email: data.user.email, role: 'customer' };
        localStorage.setItem('user_session', JSON.stringify(newSession));
        setSession(newSession);
        setCustomerEmail(data.user.email);
        setCheckoutStatus(null);
        setPasswordInput('');
        window.dispatchEvent(new Event('session_changed'));
      } else {
        setCheckoutStatus({ success: false, message: data.message || 'Authentication failed.' });
      }
    } catch {
      setCheckoutStatus({ success: false, message: 'Authentication connection error.' });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Telegram Bot': return <MessageSquare className="w-6 h-6 text-neon-cyan" />;
      case 'Discord Bot': return <Bot className="w-6 h-6 text-neon-purple" />;
      case 'Web Development': return <Globe className="w-6 h-6 text-neon-blue" />;
      case 'Digital Product': return <Gift className="w-6 h-6 text-neon-pink" />;
      default: return <Cpu className="w-6 h-6 text-neon-pink" />;
    }
  };

  const getCategoryGlow = (category: string) => {
    switch (category) {
      case 'Telegram Bot': return 'cyan' as const;
      case 'Discord Bot': return 'purple' as const;
      case 'Web Development': return 'blue' as const;
      default: return 'pink' as const;
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background Decorative Animated Neon Orbs */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-neon-cyan/10 blur-[130px] pointer-events-none animate-blob-1" />
      <div className="absolute top-[45%] right-[2%] w-[480px] h-[480px] rounded-full bg-neon-purple/8 blur-[160px] pointer-events-none animate-blob-2" />
      <div className="absolute bottom-[15%] left-[15%] w-[350px] h-[350px] rounded-full bg-neon-pink/6 blur-[120px] pointer-events-none animate-blob-3" />

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-8 text-center">
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.15 }
            }
          }}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
            }}
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-neon-purple/20 bg-neon-purple/5 text-xs font-semibold text-neon-purple tracking-wide"
          >
            <span className="w-2 h-2 rounded-full bg-neon-purple animate-pulse" />
            <span>PREMIUM DEVELOPMENT SERVICES</span>
          </motion.div>

          <motion.h1
            variants={{
              hidden: { opacity: 0, scale: 0.9, y: 25 },
              visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
            }}
            animate={{
              scale: [1, 1.018, 1],
              y: [0, -4, 0]
            }}
            transition={{
              scale: { duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
              y: { duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
            }}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-100 cursor-default"
          >
            Next-Gen Software & <br />
            <span className="text-gradient-animate">Autonomous Bots</span>
          </motion.h1>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
            }}
            className="max-w-2xl mx-auto text-base md:text-lg text-slate-400 font-medium leading-relaxed"
          >
            Elevate your project with custom built Telegram trading bots, Discord community bots, premium responsive SaaS interfaces, and custom desktop tooling.
          </motion.p>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
            }}
            className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4"
          >
            <a
              href="#services"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3 rounded-lg bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-slate-950 font-bold hover:opacity-90 transition-all hover:scale-[1.03] active:scale-[0.98] glow-purple duration-200"
            >
              <span>Explore Catalog</span>
              <ArrowRight className="w-4 h-4 animate-bounce" />
            </a>
            <a
              href="/customer"
              className="w-full sm:w-auto px-8 py-3 rounded-lg border border-[#1e1e38] hover:border-neon-cyan/50 hover:bg-slate-900/40 text-slate-200 font-semibold transition-all hover:scale-[1.03] active:scale-[0.98] duration-200"
            >
              Order Dashboard
            </a>
          </motion.div>
        </motion.div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-5xl mx-auto">
          {[
            { label: 'Super Fast Delivery', desc: 'Average 3-7 days turnaround', glow: 'hover:border-neon-cyan/50 hover:glow-cyan' },
            { label: 'Clean Codebase', desc: 'TypeScript & Next.js first', glow: 'hover:border-neon-purple/50 hover:glow-purple' },
            { label: 'Dynamic Analytics', desc: 'Full system tracking', glow: 'hover:border-neon-blue/50 hover:glow-blue' },
            { label: '24/7 Premium Support', desc: 'Free setup & integration', glow: 'hover:border-neon-pink/50 hover:glow-pink' }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, scale: 1.03 }}
              className={`p-5 rounded-xl border border-[#1e1e38] bg-[#050512]/60 glassmorphism text-left transition-all duration-300 cursor-default ${item.glow}`}
            >
              <div className="text-[10px] font-extrabold text-neon-cyan uppercase tracking-wider">{item.label}</div>
              <div className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{item.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* Infinite Logo Marquee */}
        <div className="mt-4 max-w-5xl mx-auto">
          <InfiniteMarquee />
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="max-w-7xl mx-auto px-6 pt-2 pb-20">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-100">
            Our Services & <span className="text-gradient-animate">Products</span>
          </h2>
          <p className="max-w-lg mx-auto text-sm text-slate-400">
            Select one of our pre-configured solutions or custom design structures below to get started.
          </p>
        </div>

        {/* Search Console (Premium UI Layout) */}
        <div className="relative max-w-lg mx-auto mb-10 px-4 group">
          {/* Subtle breathing glow ring behind search input */}
          <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl blur-[12px] opacity-15 group-focus-within:opacity-35 transition-all duration-500" />
          
          <div className="relative flex items-center bg-[#070718]/90 border border-[#1e1e38] group-focus-within:border-neon-cyan/50 rounded-2xl p-1 transition-all duration-300 shadow-[0_10px_35px_rgba(2,2,8,0.6)]">
            <div className="p-3 pl-4 flex items-center justify-center text-neon-cyan group-focus-within:animate-pulse">
              <Search className="w-5 h-5" />
            </div>
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search premium bots, accounts, SaaS tools..."
              className="w-full bg-transparent py-3.5 px-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none tracking-wide"
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-2.5 mr-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-[#1e1e38] hover:border-neon-pink/40 text-slate-400 hover:text-neon-pink transition-all flex items-center justify-center"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Real-time search matches label */}
          {searchQuery && (
            <div className="text-center mt-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">
              Found {filteredProducts.length} matching {filteredProducts.length === 1 ? 'result' : 'results'}
            </div>
          )}
        </div>

        {/* Category Filter Menu */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12 max-w-4xl mx-auto">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4.5 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 border ${
                  isActive
                    ? 'bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-slate-950 border-none glow-purple'
                    : 'bg-[#060614]/80 border-[#1e1e38] text-slate-400 hover:text-slate-100 hover:border-neon-cyan/40'
                }`}
              >
                {cat === 'All' ? 'All Products' : cat}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-t-neon-purple border-r-neon-cyan border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            No products found in this category.
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4 text-left">
            {filteredProducts.map((product, idx) => {
              const stockCount = product.stockAccounts?.length || 0;
              const isService = product.category.toLowerCase().includes('bot') || product.category.toLowerCase().includes('web') || product.category.toLowerCase().includes('software');
              const isDigital = !isService;
              const hasStock = !isDigital || stockCount > 0;

              return (
                <NeoCard
                  key={product.id}
                  glowColor={getCategoryGlow(product.category)}
                  delay={idx * 0.08}
                  className="relative overflow-hidden p-5 md:p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    {/* Left: Product Icon & Details */}
                    <div className="flex items-start md:items-center space-x-4 flex-grow">
                      {/* Stylized Category Icon Box / Product Image */}
                      <div className="p-0.5 bg-slate-950/80 border border-[#1e1e38] rounded-xl flex-shrink-0 flex items-center justify-center min-w-[56px] min-h-[56px] overflow-hidden">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-14 h-14 object-cover rounded-xl"
                          />
                        ) : (
                          <div className="p-3">
                            {getCategoryIcon(product.category)}
                          </div>
                        )}
                      </div>

                      {/* Middle: Title, Description, Status Badges */}
                      <div className="space-y-1.5 text-left">
                        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                          <h3 className="text-base md:text-lg font-black text-slate-100 tracking-wide">{product.name}</h3>
                          <span className="text-[9px] font-extrabold uppercase bg-slate-950/80 px-2 py-0.5 rounded-md text-slate-400 border border-[#1e1e38] tracking-widest hidden sm:inline-block">
                            {product.category}
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-400 max-w-xl leading-relaxed">{product.description}</p>
                        
                        {/* Status Pills */}
                        <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1">
                          {isDigital ? (
                            hasStock ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-950/50 text-emerald-400 border border-emerald-500/25">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>{stockCount} left</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-950/50 text-rose-400 border border-rose-500/25">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>Out of Stock</span>
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-950/50 text-emerald-400 border border-emerald-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Ready to Build</span>
                            </span>
                          )}
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-sky-950/50 text-sky-400 border border-sky-500/25">
                            <span>⏱️ {product.deliveryTime}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Divider line for desktop */}
                    <div className="hidden md:block w-[1px] h-12 bg-[#1e1e38]" />

                    {/* Right: Price & CTA Actions */}
                    <div className="flex md:flex-col items-center md:items-stretch justify-between md:justify-center gap-3 min-w-[130px] w-full md:w-auto">
                      {/* Price Badge */}
                      <div className="px-4 py-1.5 rounded-lg bg-slate-950/80 border border-[#1e1e38] text-center text-sm md:text-base font-black text-slate-100 flex-grow md:flex-grow-0">
                        ${product.price}
                      </div>

                      {/* Animated Buy Button */}
                      {hasStock ? (
                        <motion.button
                          onClick={() => setSelectedProduct(product)}
                          whileHover={{ 
                            scale: 1.05,
                            boxShadow: "0 0 15px rgba(249, 115, 22, 0.4)",
                            backgroundImage: "linear-gradient(to right, #f97316, #ec4899, #ef4444)"
                          }}
                          whileTap={{ scale: 0.97 }}
                          className="w-full px-6 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-md flex items-center justify-center whitespace-nowrap"
                        >
                          Buy Now
                        </motion.button>
                      ) : (
                        <button
                          disabled
                          className="w-full px-6 py-2 rounded-lg bg-slate-900 border border-[#1e1e38] text-slate-600 font-black text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center whitespace-nowrap"
                        >
                          Out of Stock
                        </button>
                      )}
                    </div>
                  </div>
                </NeoCard>
              );
            })}
          </div>
        )}
      </section>

      {/* Checkout & Unboxing Modals */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#020208]/90 backdrop-blur-md">
            
            {/* 1. Main Checkout Form & Loading Progress & Real QR */}
            {!placedOrder ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md glassmorphism border border-neon-cyan/30 rounded-2xl overflow-hidden shadow-2xl p-6 relative"
              >
                {(!isProcessing || qrCodeUrl) && (
                  <button
                    onClick={resetCheckout}
                    className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                 <h3 className="text-xl font-bold text-slate-100 mb-2">
                  {!session 
                    ? (authMode === 'signin' ? 'Sign In Required' : 'Register Account')
                    : (qrCodeUrl ? 'ABA / KHQR Payment' : 'Fulfillment Checkout')}
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  {!session 
                    ? 'You must have a secure client profile to proceed to the payment.'
                    : (qrCodeUrl 
                      ? 'Scan this dynamic QR code using your bank app to complete the transaction.'
                      : 'Confirm your order details below to generate the secure payment QR.')}
                </p>

                {/* Selected Service Detail */}
                {!qrCodeUrl && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-[#1e1e38] mb-6">
                    <div className="text-xs font-semibold text-slate-500">Selected Service</div>
                    <div className="text-sm font-bold text-slate-100 mt-1">{selectedProduct.name}</div>
                    
                    {appliedCoupon ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-sm text-slate-500 line-through">${selectedProduct.price}</span>
                        <span className="text-lg font-black text-neon-cyan">${(selectedProduct.price * (1 - appliedCoupon.discount / 100)).toFixed(2)}</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 ml-2">-{appliedCoupon.discount}% OFF</span>
                      </div>
                    ) : (
                      <div className="text-lg font-black text-neon-cyan mt-2">${selectedProduct.price}</div>
                    )}
                  </div>
                )}

                {/* If guest, display auth force view */}
                {!session ? (
                  <form onSubmit={handleCheckoutAuth} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-slate-950/80 border border-[#1e1e38] rounded-md px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Cabinet Password</label>
                      <input
                        type="password"
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950/80 border border-[#1e1e38] rounded-md px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50 transition-all"
                      />
                    </div>

                    {checkoutStatus && !checkoutStatus.success && (
                      <div className="p-3 rounded text-xs font-medium bg-rose-950/50 text-rose-400 border border-rose-500/20">
                        {checkoutStatus.message}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 rounded-lg bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-slate-950 font-black text-xs tracking-wider uppercase transition-all glow-cyan hover:scale-[1.01] active:scale-[0.99] duration-150"
                    >
                      {authMode === 'signin' ? 'Sign In & Proceed' : 'Register & Proceed'}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                          setCheckoutStatus(null);
                        }}
                        className="text-xs text-neon-cyan hover:underline"
                      >
                        {authMode === 'signin' 
                          ? "Don't have a secure cabinet profile? Register" 
                          : "Already have a secure cabinet profile? Sign In"}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Form view if logged in */
                  !isProcessing && !qrCodeUrl && (
                    <form onSubmit={handlePurchaseSubmit} className="space-y-4">
                      {(selectedProduct.category.toLowerCase().includes('bot') || selectedProduct.category.toLowerCase().includes('web') || selectedProduct.category.toLowerCase().includes('software')) && (
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Project Requirements & Design Notes</label>
                          <textarea
                            rows={3}
                            value={requirements}
                            onChange={(e) => setRequirements(e.target.value)}
                            placeholder="Explain what you want built (design styles, functions, specific guidelines)..."
                            className="w-full bg-slate-950/80 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50 transition-all resize-none"
                          />
                        </div>
                      )}

                      {/* Coupon Section */}
                      <div className="pt-2 border-t border-[#1e1e38]">
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Have a Coupon Code?</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={couponCodeInput}
                            onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                            placeholder="Enter code here"
                            className="flex-grow bg-slate-950/80 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50 uppercase"
                            disabled={!!appliedCoupon}
                          />
                          {!appliedCoupon ? (
                            <button
                              type="button"
                              onClick={async () => {
                                setCouponError('');
                                if (!couponCodeInput) return;
                                try {
                                  const res = await fetch('/api/coupons', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'validate', coupon: { code: couponCodeInput } })
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    setAppliedCoupon({ code: data.coupon.code, discount: data.coupon.discountPercentage });
                                  } else {
                                    setCouponError(data.error || 'Invalid code');
                                  }
                                } catch (e) {
                                  setCouponError('Error applying code');
                                }
                              }}
                              className="px-4 bg-slate-900 border border-[#1e1e38] text-xs font-bold text-slate-300 rounded hover:text-neon-cyan hover:border-neon-cyan transition-all"
                            >
                              Apply
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setAppliedCoupon(null); setCouponCodeInput(''); }}
                              className="px-4 bg-rose-950 border border-rose-500/30 text-xs font-bold text-rose-400 rounded hover:text-rose-300 transition-all"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {couponError && <p className="text-[10px] text-rose-400 mt-1">{couponError}</p>}
                        {appliedCoupon && (
                          <p className="text-[10px] font-bold text-emerald-400 mt-1">
                            {appliedCoupon.discount}% discount applied!
                          </p>
                        )}
                      </div>

                      {checkoutStatus && !checkoutStatus.success && (
                        <div className="p-3 rounded text-xs font-medium bg-rose-950/50 text-rose-400 border border-rose-500/20">
                          {checkoutStatus.message}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-slate-950 font-black text-xs tracking-wider uppercase transition-all glow-cyan hover:scale-[1.01] active:scale-[0.99] duration-150"
                      >
                        Confirm Setup
                      </button>
                    </form>
                  )
                )}

                {/* Loading / Liquid setup status */}
                {isProcessing && !qrCodeUrl && (
                  <div className="space-y-6 py-6 text-center">
                    <Loader2 className="w-8 h-8 text-neon-cyan animate-spin mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">Initializing Payment Gateway...</h4>
                      <p className="text-xs text-slate-400 mt-1">Generating unique transaction QR code</p>
                    </div>

                    <div className="relative w-full h-8 bg-slate-950 border border-[#1e1e38] rounded-full overflow-hidden shadow-inner">
                      <motion.div
                        className="absolute bottom-0 left-0 bg-gradient-to-r from-neon-cyan to-neon-blue h-full"
                        style={{ width: `${progress}%` }}
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-100 mix-blend-difference">
                        {progress}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Real QR display */}
                {qrCodeUrl && (
                  <div className="space-y-5 text-center py-2 flex flex-col items-center">
                    {/* Clean Simple Expiration Timer */}
                    <div className="flex items-center space-x-1.5 bg-rose-950/40 border border-rose-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold text-rose-400">
                      <span className="w-1 h-1 bg-rose-400 rounded-full animate-ping" />
                      <span>Expires In: {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}</span>
                    </div>

                    {/* QR Code Container (Larger & Cleaner) */}
                    <div className="p-4 bg-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.06)] border border-slate-200 max-w-[250px] w-full transition-all duration-300">
                      <img 
                        src={qrCodeUrl} 
                        alt="Scan ABA Pay Code" 
                        className="w-full h-auto rounded-lg"
                      />
                    </div>

                    {/* Status Check and Loading Spinner */}
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 py-1 bg-slate-950/80 border border-[#1e1e38] rounded-lg px-4.5 w-full justify-center">
                      <Loader2 className="w-3.5 h-3.5 text-neon-cyan animate-spin" />
                      <span>{paymentStatusText}</span>
                    </div>

                    <p className="text-[10px] text-slate-500 text-center max-w-xs leading-relaxed">
                      Actual cost will register as ${selectedProduct.price} inside client panel. Paid transaction fee is covered.
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              /* 3. Floating Glass Vault (Unboxing success animation) */
              <motion.div
                initial={{ scale: 0.8, opacity: 0, rotate: -3 }}
                animate={{ scale: 1, opacity: 1, rotate: 0, transition: { type: 'spring', damping: 15 } }}
                className="w-full max-w-md border border-neon-purple/45 rounded-2xl p-8 text-center shadow-[0_0_40px_rgba(157,78,221,0.25)] relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 10, 36, 0.85) 0%, rgba(5, 5, 15, 0.95) 100%)',
                  backdropFilter: 'blur(20px)'
                }}
              >
                <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute bottom-4 left-6 w-3 h-3 border border-neon-cyan rounded-full animate-bounce delay-75" />
                  <div className="absolute top-12 right-8 w-4 h-4 border border-neon-purple rounded-full animate-bounce delay-150" />
                  <div className="absolute bottom-16 right-16 w-2.5 h-2.5 border border-neon-pink rounded-full animate-bounce delay-200" />
                </div>

                <div className="w-20 h-20 bg-gradient-to-tr from-neon-purple via-neon-blue to-neon-cyan rounded-full flex items-center justify-center mx-auto mb-6 glow-purple border border-neon-purple/50 animate-bounce">
                  <Sparkles className="w-10 h-10 text-slate-950" />
                </div>

                <h3 className="text-2xl font-black text-slate-100 tracking-wide uppercase text-gradient-animate">
                  Vault Unlocked
                </h3>
                
                <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  Your purchase setup is successfully registered! Check your cabinet credentials or deliverables information below.
                </p>

                {!(selectedProduct.category.toLowerCase().includes('bot') || selectedProduct.category.toLowerCase().includes('web') || selectedProduct.category.toLowerCase().includes('software')) ? (
                  <div className="my-6 p-4.5 rounded-xl bg-slate-950/90 border border-emerald-500/20 text-left max-w-sm mx-auto space-y-2">
                    <div className="text-[10px] uppercase font-extrabold text-emerald-400 tracking-wider">📦 Auto-Delivered Keys / Account:</div>
                    <pre className="text-xs font-mono font-bold text-slate-200 whitespace-pre-wrap break-all bg-[#0a0616] p-3.5 rounded border border-[#1e1e38] shadow-inner select-all">
                      {placedOrder.deliverables || 'Generating setup credentials... Please wait.'}
                    </pre>
                  </div>
                ) : (
                  <div className="my-6 p-4.5 rounded-xl bg-slate-950/90 border border-neon-blue/20 text-left max-w-sm mx-auto space-y-2.5">
                    <div className="text-[10px] uppercase font-extrabold text-neon-blue tracking-wider">⏱️ Development Wait Time:</div>
                    <div className="text-sm font-black text-slate-100 flex items-center justify-between">
                      <span>Estimated Delivery:</span>
                      <span className="text-neon-cyan bg-neon-cyan/5 border border-neon-cyan/20 px-2.5 py-0.5 rounded text-xs">{selectedProduct.deliveryTime}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed pt-1.5 border-t border-[#1e1e38]">
                      We will contact you shortly on <span className="text-slate-300 font-bold">{customerEmail}</span> to align on the development design requirements.
                    </p>
                  </div>
                )}

                <div className="my-3 p-3 rounded-lg bg-slate-950/60 border border-[#1e1e38] max-w-xs mx-auto flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Order ID:</span>
                  <span className="font-mono font-bold text-neon-cyan select-all">{placedOrder.id}</span>
                </div>

                <button
                  onClick={() => {
                    window.location.href = '/customer';
                  }}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-slate-950 font-black text-xs tracking-wider uppercase transition-all glow-purple hover:scale-[1.02] active:scale-[0.98]"
                >
                  Enter Client Dashboard
                </button>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
