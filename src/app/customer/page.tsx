'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Loader2, ArrowRight, ShieldCheck, Clock, Download, FileText, CheckCircle2 } from 'lucide-react';
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
  const [session, setSession] = useState<{ email: string } | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.role === 'customer') {
        setSession(parsed);
        fetchCustomerOrders(parsed.email);
      }
    }
  }, []);

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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    if (!passwordInput || passwordInput.length < 4) {
      setLoginError('Password must be at least 4 characters long.');
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          email: emailInput,
          password: passwordInput
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const newSession = { email: data.user.email, role: 'customer' };
        localStorage.setItem('user_session', JSON.stringify(newSession));
        setSession(newSession);
        setLoginError('');
        fetchCustomerOrders(data.user.email);
        window.dispatchEvent(new Event('session_changed'));
      } else {
        setLoginError(data.message || 'Authentication failed.');
      }
    } catch {
      setLoginError('Server connection error.');
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
              {authMode === 'signin' 
                ? 'Sign in to access your digital deliverables, keys, and setup requirements.'
                : 'Create your private customer account profile to secure your future orders.'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="buyer@example.com"
                className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neon-cyan/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Security Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neon-cyan/50 transition-all"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-950/50 border border-rose-500/25 rounded text-xs text-rose-400">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-slate-950 font-black text-xs tracking-wider uppercase transition-all glow-cyan hover:scale-[1.01] active:scale-[0.99] duration-150"
            >
              {authMode === 'signin' ? 'Sign In' : 'Register Account'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                setLoginError('');
              }}
              className="text-xs text-neon-cyan hover:underline"
            >
              {authMode === 'signin' 
                ? "Don't have a secure profile? Sign Up here" 
                : "Already registered? Sign In here"}
            </button>
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

        {/* Sidebar Info */}
        <div className="space-y-6">
          <NeoCard glowColor="blue">
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-neon-blue" />
              <span>Purchase Protection</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              All bot assets, web systems, and softwares feature full integration assistance and clean code documentation.
            </p>
          </NeoCard>

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
