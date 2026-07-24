'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Loader2, ArrowRight, ShieldCheck, Clock, Download, FileText, CheckCircle2, DollarSign, Key, Zap, X } from 'lucide-react';
import NeoCard from '@/components/NeoCard';

interface Order {
  id: string;
  customerEmail: string;
  productId: string;
  productName: string;
  price: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
  deliverables?: string;
  requirements?: string;
}

export default function CustomerDashboard() {
  const [session, setSession] = useState<{ email: string, role: string } | null>(null);
  const [resellerDetails, setResellerDetails] = useState<{ balance: number, apiKey: string } | null>(null);
  const [resellerAction, setResellerAction] = useState<'register' | 'topup' | null>(null);
  const [topupAmount, setTopupAmount] = useState('10');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [paymentStatusText, setPaymentStatusText] = useState('');
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot-password'>('signin');
  const [codeInput, setCodeInput] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.role === 'customer' || parsed.role === 'reseller') {
        setSession(parsed);
        fetchCustomerOrders(parsed.email);
        if (parsed.role === 'reseller') fetchResellerDetails(parsed.email);
      }
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }
  }, []);

  const fetchResellerDetails = async (email: string) => {
    try {
      const res = await fetch('/api/reseller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'details', email })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setResellerDetails({ balance: data.balance, apiKey: data.apiKey });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCustomerOrders = async (email: string) => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setSuccessMsg('');
    if (!emailInput || !emailInput.includes('@')) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const action = authMode === 'signup' ? 'send-signup-code' : 'send-reset-code';
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email: emailInput })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setCodeSent(true);
        setSuccessMsg(data.message || 'Code sent to your email.');
      } else {
        setLoginError(data.message || 'Failed to send code.');
      }
    } catch {
      setLoginError('Server connection error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setSuccessMsg('');
    if (!emailInput || !emailInput.includes('@')) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    if (!passwordInput || passwordInput.length < 4) {
      setLoginError('Password must be at least 4 characters long.');
      return;
    }

    if ((authMode === 'signup' || authMode === 'forgot-password') && !codeSent) {
      // Should not happen as UI prevents it, but just in case
      return;
    }

    if ((authMode === 'signup' || authMode === 'forgot-password') && !codeInput) {
      setLoginError('Please enter the verification code.');
      return;
    }

    setIsProcessing(true);
    try {
      let action: string = authMode;
      if (authMode === 'forgot-password') action = 'reset-password';

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          email: emailInput,
          password: passwordInput,
          code: codeInput,
          username: usernameInput,
          phone: phoneInput
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (authMode === 'forgot-password') {
          setSuccessMsg('Password reset successful! Please sign in.');
          setAuthMode('signin');
          setCodeSent(false);
          setPasswordInput('');
          setCodeInput('');
        } else {
          // Signup or Signin success
          const newSession = { email: data.user.email, role: 'customer' };
          localStorage.setItem('user_session', JSON.stringify(newSession));
          setSession(newSession);
          fetchCustomerOrders(data.user.email);
          window.dispatchEvent(new Event('session_changed'));
        }
      } else {
        setLoginError(data.message || 'Authentication failed.');
      }
    } catch {
      setLoginError('Server connection error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResellerPayment = async (action: 'register' | 'topup') => {
    if (!session) return;
    const amount = action === 'register' ? '1.00' : topupAmount;
    setIsProcessing(true);
    setPaymentStatusText('Generating Secure Payment QR...');
    setResellerAction(action);
    setQrCodeUrl('');

    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', amount })
      });
      if (!res.ok) throw new Error('Gateway error');
      const paymentData = await res.json();
      
      if (paymentData.status?.code === '00') {
        setQrCodeUrl(paymentData.download_qr);
        setPaymentStatusText('Scan KHQR using ABA or any bank app to pay...');

        pollTimerRef.current = setInterval(async () => {
          try {
            const checkRes = await fetch('/api/payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'check', tran_id: paymentData.status.tran_id, client_id: paymentData.client_id })
            });

            if (checkRes.ok) {
              const statusData = await checkRes.json();
              const isApproved = statusData.meta?.payment_approved === true ||
                                 statusData.meta?.finished === true ||
                                 statusData.data?.message?.message === 'Approved';

              if (isApproved) {
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                setPaymentStatusText('Payment Approved! Updating account...');
                
                const completeRes = await fetch('/api/reseller', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action,
                    email: session.email,
                    amount,
                    tran_id: paymentData.status.tran_id,
                    client_id: paymentData.client_id
                  })
                });

                if (completeRes.ok) {
                  const data = await completeRes.json();
                  if (action === 'register') {
                    const newSession = { email: session.email, role: 'reseller' };
                    localStorage.setItem('user_session', JSON.stringify(newSession));
                    setSession(newSession);
                    fetchResellerDetails(session.email);
                  } else {
                    fetchResellerDetails(session.email);
                  }
                  setResellerAction(null);
                  setIsProcessing(false);
                }
              }
            }
          } catch (e) { console.error(e); }
        }, 3000);
      } else {
        setIsProcessing(false);
      }
    } catch (e) {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-sky-950/60 text-sky-400 border border-sky-500/25">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>In Progress</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-950/60 text-rose-400 border border-rose-500/25">
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-yellow-950/60 text-yellow-400 border border-yellow-500/25">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
    }
  };

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-6 py-20">
        <NeoCard glowColor="cyan" className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-100">Customer Cabinet</h1>
            <p className="text-xs text-slate-400">
              {authMode === 'signin' && 'Sign in to access your digital deliverables, keys, and setup requirements.'}
              {authMode === 'signup' && 'Create your private customer account profile to secure your future orders.'}
              {authMode === 'forgot-password' && 'Reset your forgotten password via email verification.'}
            </p>
          </div>

          <form onSubmit={authMode === 'signin' || codeSent ? handleAuthSubmit : handleRequestCode} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter your username"
                    disabled={codeSent}
                    className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neon-cyan/50 transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+855 12 345 678"
                    disabled={codeSent}
                    className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neon-cyan/50 transition-all disabled:opacity-50"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="buyer@example.com"
                disabled={codeSent}
                className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neon-cyan/50 transition-all disabled:opacity-50"
              />
            </div>

            {(authMode === 'signin' || codeSent) && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-slate-400">
                    {authMode === 'forgot-password' ? 'New Security Password' : 'Security Password'}
                  </label>
                  {authMode === 'signin' && (
                    <button type="button" onClick={() => {setAuthMode('forgot-password'); setCodeSent(false); setLoginError(''); setSuccessMsg('');}} className="text-[10px] text-neon-blue hover:underline">
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neon-cyan/50 transition-all"
                />
              </div>
            )}

            {codeSent && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 mt-4">Verification Code</label>
                <input
                  type="text"
                  required
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neon-cyan/50 transition-all tracking-widest text-center"
                />
                <p className="text-[10px] text-slate-500 mt-1 text-center">Check your email for the 6-digit code.</p>
              </motion.div>
            )}

            {loginError && (
              <div className="p-3 bg-rose-950/50 border border-rose-500/25 rounded text-xs text-rose-400">
                {loginError}
              </div>
            )}
            
            {successMsg && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/25 rounded text-xs text-emerald-400">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 rounded-lg flex items-center justify-center space-x-2 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-slate-950 font-black text-xs tracking-wider uppercase transition-all glow-cyan hover:scale-[1.01] active:scale-[0.99] duration-150 disabled:opacity-50"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {authMode === 'signin' ? 'Sign In' : 
                 !codeSent ? 'Send Verification Code' : 
                 authMode === 'signup' ? 'Verify & Register' : 'Reset Password'}
              </span>
            </button>
          </form>

          <div className="text-center pt-2 flex flex-col space-y-2">
            {authMode !== 'signup' && (
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setCodeSent(false);
                  setLoginError('');
                  setSuccessMsg('');
                }}
                className="text-xs text-neon-cyan hover:underline"
              >
                Don't have a secure profile? Sign Up here
              </button>
            )}
            
            {authMode !== 'signin' && (
              <button
                onClick={() => {
                  setAuthMode('signin');
                  setCodeSent(false);
                  setLoginError('');
                  setSuccessMsg('');
                }}
                className="text-xs text-neon-cyan hover:underline"
              >
                Already registered? Sign In here
              </button>
            )}
          </div>
        </NeoCard>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-[#1e1e38]">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center space-x-2">
            <ShoppingBag className="w-6 h-6 text-neon-cyan" />
            <span>My Client Cabinet</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Order tracking and download keys for: <span className="text-neon-cyan font-bold">{session.email}</span></p>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('user_session');
            setSession(null);
            window.dispatchEvent(new Event('session_changed'));
          }}
          className="mt-4 sm:mt-0 px-3.5 py-1.5 bg-slate-900 border border-[#1e1e38] hover:border-neon-pink/50 text-slate-300 hover:text-neon-pink text-xs font-semibold rounded transition-all"
        >
          Logout Cabinet
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Orders List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-slate-200">Registered Purchases</h2>

          {loadingOrders ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <NeoCard glowColor="cyan" className="p-8 text-center text-slate-400 text-xs">
              No orders found for this email address. Make a purchase on the catalog page!
            </NeoCard>
          ) : (
            orders.map((order) => (
              <NeoCard key={order.id} glowColor="cyan" className="p-5 space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-neon-cyan font-bold uppercase tracking-wider">{order.id}</span>
                    <h3 className="text-sm font-extrabold text-slate-100 mt-0.5">{order.productName}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Ordered: {new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-100">${order.price}</div>
                    <div className="mt-1">{getStatusBadge(order.status)}</div>
                  </div>
                </div>

                {order.requirements && (
                  <div className="border-t border-[#1e1e38] pt-3 text-left">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Requirements:</div>
                    <p className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded border border-[#1a1a36] whitespace-pre-wrap leading-relaxed">
                      {order.requirements}
                    </p>
                  </div>
                )}

                {order.status === 'Completed' && order.deliverables && (
                  <div className="border-t border-[#1e1e38] pt-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 mb-2">
                      <Download className="w-3.5 h-3.5" />
                      <span>Deliverables & Credentials</span>
                    </div>
                    <pre className="p-3 bg-slate-950/80 border border-[#1e1e38] rounded text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-all">
                      {order.deliverables}
                    </pre>
                  </div>
                )}
              </NeoCard>
            ))
          )}
        </div>

        {/* Sidebar Info & Reseller Panel */}
        <div className="space-y-6">
          {session.role === 'customer' && (
            <NeoCard glowColor="purple">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 mb-4">
                <Zap className="w-4 h-4 text-neon-purple" />
                <span>Become a Reseller</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Unlock 20% flat discount on all products and access our developer API to automate orders. One-time registration fee: $1.00.
              </p>
              <button 
                onClick={() => handleResellerPayment('register')}
                className="w-full py-2 bg-gradient-to-r from-neon-purple to-neon-pink rounded text-xs font-bold text-slate-100 uppercase tracking-wide hover:opacity-90 transition-all"
              >
                Register for $1.00
              </button>
            </NeoCard>
          )}

          {session.role === 'reseller' && resellerDetails && (
            <>
              <NeoCard glowColor="cyan" className="border-neon-cyan/30 bg-[#050512]">
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 mb-4">
                  <DollarSign className="w-4 h-4 text-neon-cyan" />
                  <span>Reseller Balance</span>
                </h3>
                <div className="text-3xl font-black text-neon-cyan mb-4">
                  ${resellerDetails.balance.toFixed(2)}
                </div>
                <div className="flex space-x-2 mb-2">
                  <input 
                    type="number" 
                    value={topupAmount} 
                    onChange={(e) => setTopupAmount(e.target.value)} 
                    className="flex-1 bg-slate-950 border border-[#1e1e38] rounded px-3 py-1 text-sm text-slate-200 focus:outline-none focus:border-neon-cyan/50"
                  />
                  <button 
                    onClick={() => handleResellerPayment('topup')}
                    className="px-4 py-1.5 bg-neon-cyan text-slate-950 rounded text-xs font-bold uppercase"
                  >
                    Top Up
                  </button>
                </div>
              </NeoCard>
              
              <NeoCard glowColor="blue">
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 mb-4">
                  <Key className="w-4 h-4 text-neon-blue" />
                  <span>Reseller API Access</span>
                </h3>
                <p className="text-[10px] text-slate-400 mb-2">Your secure API key (Do not share):</p>
                <div className="p-2 bg-slate-950 border border-[#1e1e38] rounded text-[10px] font-mono text-slate-300 break-all mb-4 relative group">
                  <span className="blur-sm group-hover:blur-none transition-all">{resellerDetails.apiKey}</span>
                </div>
                <div className="space-y-2 border-t border-[#1e1e38] pt-4">
                  <div className="text-[10px] font-bold text-slate-300">API Usage Example (cURL)</div>
                  <pre className="p-2 bg-slate-950 border border-[#1e1e38] rounded text-[9px] font-mono text-slate-400 overflow-x-auto">
                    {`curl -X POST https://chhayheng.online/api/reseller \\
  -H 'Content-Type: application/json' \\
  -d '{
    "action": "order",
    "apiKey": "${resellerDetails.apiKey.substring(0, 8)}...",
    "productId": "1"
  }'`}
                  </pre>
                </div>
              </NeoCard>
            </>
          )}

          {resellerAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <NeoCard glowColor="pink" className="w-full max-w-md p-6 relative">
                <button 
                  onClick={() => {
                    setResellerAction(null);
                    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                  }} 
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-bold text-slate-100">
                    {resellerAction === 'register' ? 'Reseller Registration ($1)' : `Top Up $${topupAmount}`}
                  </h3>
                  {qrCodeUrl ? (
                    <div className="space-y-4">
                      <div className="w-48 h-48 mx-auto rounded-xl border border-[#1e1e38] bg-white p-2">
                        <img src={qrCodeUrl} alt="KHQR" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-xs font-mono text-neon-cyan animate-pulse">{paymentStatusText}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 text-neon-pink animate-spin mb-4" />
                      <p className="text-xs text-slate-400">{paymentStatusText}</p>
                    </div>
                  )}
                </div>
              </NeoCard>
            </div>
          )}

          <NeoCard glowColor="purple">
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 mb-4">
              <FileText className="w-4 h-4 text-neon-purple" />
              <span>Support Channel</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Need custom settings, hosting setup, or API integrations? Join our VIP support Discord with your order ID.
            </p>
          </NeoCard>
        </div>
      </div>
    </div>
  );
}
