'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Key, Copy, Check, DollarSign, TrendingUp, ShoppingBag, 
  Code, RefreshCw, Zap, ShieldCheck, ArrowRight, Layers, HelpCircle
} from 'lucide-react';
import NeoCard from '@/components/NeoCard';
import Navbar from '@/components/Navbar';

export default function ResellerPage() {
  const [session, setSession] = useState<{ email: string; role: string } | null>(null);
  const [resellerData, setResellerData] = useState<{
    balance: number;
    apiKey: string;
    orders: any[];
    stats: { totalOrders: number; totalSales: number; weeklySales: number; monthlySales: number };
  } | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // $1 Activation / Top-Up State
  const [isActivating, setIsActivating] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(10);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [tranId, setTranId] = useState('');
  const [clientId, setClientId] = useState('');
  const [paymentStatusText, setPaymentStatusText] = useState('');
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSession(parsed);
        if (parsed.role === 'reseller') {
          fetchResellerDashboard(parsed.email);
        }
      } catch (e) {}
    }
    fetchWholesaleProducts();
    setLoading(false);
  }, []);

  const fetchResellerDashboard = async (email: string) => {
    try {
      const res = await fetch('/api/reseller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'details', email })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setResellerData(data);
        }
      }
    } catch (e) {
      console.error('Fetch reseller details error:', e);
    }
  };

  const fetchWholesaleProducts = async () => {
    try {
      const res = await fetch('/api/reseller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'products' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setProducts(data.products || []);
      }
    } catch (e) {
      console.error('Fetch wholesale products error:', e);
    }
  };

  const handleCreateActivationQR = async (amountVal: number, isTopUp = false) => {
    if (!session) {
      alert('Please sign in or register an account first.');
      window.location.href = '/customer';
      return;
    }

    setIsActivating(true);
    setPaymentStatusText('Generating PayWay KHQR...');

    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          amount: amountVal.toString()
        })
      });

      if (!res.ok) {
        setPaymentStatusText('Failed to create KHQR. Please try again.');
        setIsActivating(false);
        return;
      }

      const data = await res.json();
      if (data.qr || data.data?.qr) {
        setQrCodeUrl(data.qr || data.data?.qr);
        setTranId(data.tran_id || data.data?.tran_id);
        setClientId(data.client_id || data.data?.client_id);
        setPaymentStatusText('Scan KHQR using your bank app to complete.');

        // Start checking payment status automatically
        startPaymentChecking(data.tran_id || data.data?.tran_id, data.client_id || data.data?.client_id, isTopUp, amountVal);
      } else {
        setPaymentStatusText('Failed to generate QR code.');
        setIsActivating(false);
      }
    } catch (e) {
      console.error(e);
      setPaymentStatusText('Connection error. Please try again.');
      setIsActivating(false);
    }
  };

  const startPaymentChecking = (tId: string, cId: string, isTopUp: boolean, amountVal: number) => {
    setPaymentChecking(true);
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(interval);
        setPaymentChecking(false);
        setPaymentStatusText('Payment check timed out. Please refresh if completed.');
        return;
      }

      try {
        const checkRes = await fetch('/api/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check', tran_id: tId, client_id: cId })
        });

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const isApproved = (
            checkData.meta?.payment_approved === true ||
            checkData.meta?.finished === true ||
            checkData.data?.message?.message === 'Approved'
          );

          if (isApproved) {
            clearInterval(interval);
            setPaymentChecking(false);
            setPaymentStatusText('Payment Approved!');

            if (!isTopUp) {
              // Activate Reseller Account
              const regRes = await fetch('/api/reseller', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'register', email: session?.email, tran_id: tId, client_id: cId })
              });
              if (regRes.ok) {
                const regData = await regRes.json();
                if (regData.success) {
                  const updatedSession = { ...session, role: 'reseller' };
                  localStorage.setItem('user_session', JSON.stringify(updatedSession));
                  setSession(updatedSession as any);
                  setActivationSuccess(true);
                  fetchResellerDashboard(session!.email);
                  window.dispatchEvent(new Event('session_changed'));
                }
              }
            } else {
              // Top Up Balance
              const topRes = await fetch('/api/reseller', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'topup', email: session?.email, tran_id: tId, client_id: cId, amount: amountVal })
              });
              if (topRes.ok) {
                setShowTopUpModal(false);
                fetchResellerDashboard(session!.email);
                alert(`Successfully topped up $${amountVal}!`);
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 5000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#04040d] text-slate-100 font-sans pb-24">
      <Navbar />

      {/* Hero Header */}
      <div className="relative pt-32 pb-12 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-400 text-xs font-black tracking-wide mb-4 glow-cyan">
          <Zap className="w-3.5 h-3.5" />
          <span>RESELLER API PORTAL — 20% WHOLESALE DISCOUNT</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-100">
          Automate Orders with <span className="text-gradient-cyan-purple">Reseller API</span>
        </h1>
        <p className="text-slate-400 text-xs md:text-sm max-w-2xl mx-auto mt-3">
          Connect your own web shop or Telegram bot to our API. Enjoy 20% wholesale discount, automated instant stock delivery, and real-time sales tracking.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-10">

        {/* IF USER IS NOT LOGGED IN OR NOT A RESELLER */}
        {(!session || session.role !== 'reseller') && (
          <NeoCard glowColor="purple" className="p-8 max-w-3xl mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(245,158,11,0.4)]">
              <Briefcase className="w-8 h-8 text-slate-950" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-100">Become an Official Reseller</h2>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                Pay a one-time activation fee of <span className="text-amber-400 font-bold">$1.00</span> to unlock lifetime 20% wholesale discounts across the website and generate your secret API key.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-xl mx-auto pt-2">
              <div className="p-3 bg-slate-950 border border-[#1e1e38] rounded-lg">
                <div className="text-amber-400 font-bold text-xs flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>20% OFF Everything</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Automatic wholesale pricing on API & main website.</div>
              </div>
              <div className="p-3 bg-slate-950 border border-[#1e1e38] rounded-lg">
                <div className="text-neon-cyan font-bold text-xs flex items-center space-x-1">
                  <Key className="w-3.5 h-3.5" />
                  <span>API Integration</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Secret API key to place automated orders from your web/bot.</div>
              </div>
              <div className="p-3 bg-slate-950 border border-[#1e1e38] rounded-lg">
                <div className="text-emerald-400 font-bold text-xs flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Instant Delivery</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Automated stock account popping & credentials response.</div>
              </div>
            </div>

            {!qrCodeUrl ? (
              <button
                onClick={() => handleCreateActivationQR(1.00, false)}
                disabled={isActivating}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm rounded-xl hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all disabled:opacity-50"
              >
                {isActivating ? 'GENERATING KHQR...' : 'ACTIVATE RESELLER ACCOUNT ($1.00 KHQR)'}
              </button>
            ) : (
              <div className="space-y-4 max-w-sm mx-auto p-5 bg-slate-950 border border-[#1e1e38] rounded-2xl">
                <div className="text-xs font-bold text-amber-400">{paymentStatusText}</div>
                <img src={qrCodeUrl} alt="PayWay KHQR" className="w-64 h-64 mx-auto rounded-xl border border-amber-500/30 p-2 bg-white" />
                <p className="text-[11px] text-slate-400">Scan with your bank app (ABA, Wing, ACLEDA) to activate.</p>
                {paymentChecking && <div className="text-xs text-neon-cyan animate-pulse">Checking payment approval...</div>}
              </div>
            )}

            {activationSuccess && (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold">
                🎉 Congratulations! Your Reseller Account is now activated!
              </div>
            )}
          </NeoCard>
        )}

        {/* IF USER IS A RESELLER */}
        {session && session.role === 'reseller' && resellerData && (
          <div className="space-y-8">
            
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <NeoCard glowColor="purple" className="p-5">
                <div className="text-xs text-slate-400 font-semibold">Reseller Balance</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">${resellerData.balance.toFixed(2)}</div>
                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="mt-3 text-[11px] font-bold px-3 py-1 bg-emerald-500 text-slate-950 rounded hover:bg-emerald-400 transition-all"
                >
                  + Top Up Balance
                </button>
              </NeoCard>

              <NeoCard glowColor="cyan" className="p-5">
                <div className="text-xs text-slate-400 font-semibold">Total Sales</div>
                <div className="text-2xl font-black text-slate-100 mt-1">${resellerData.stats.totalSales.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500 mt-1">{resellerData.stats.totalOrders} Total Orders</div>
              </NeoCard>

              <NeoCard glowColor="pink" className="p-5">
                <div className="text-xs text-slate-400 font-semibold">Monthly Sales</div>
                <div className="text-2xl font-black text-neon-pink mt-1">${resellerData.stats.monthlySales.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500 mt-1">Last 30 Days</div>
              </NeoCard>

              <NeoCard glowColor="cyan" className="p-5">
                <div className="text-xs text-slate-400 font-semibold">Weekly Sales</div>
                <div className="text-2xl font-black text-neon-cyan mt-1">${resellerData.stats.weeklySales.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500 mt-1">Last 7 Days</div>
              </NeoCard>
            </div>

            {/* Secret API Key Card */}
            <NeoCard glowColor="purple" className="p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center space-x-2">
                <Key className="text-amber-400 w-5 h-5" />
                <span>Your Secret Reseller API Key</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">Use this secret key to authenticate your HTTP requests when placing automated API orders.</p>

              <div className="flex items-center space-x-3 bg-slate-950 p-3.5 border border-[#1e1e38] rounded-xl max-w-2xl">
                <input
                  type={showKey ? "text" : "password"}
                  readOnly
                  value={resellerData.apiKey}
                  className="bg-transparent font-mono text-xs text-amber-400 w-full focus:outline-none"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => copyToClipboard(resellerData.apiKey)}
                  className="px-3 py-1.5 bg-slate-900 border border-[#1e1e38] hover:border-amber-400/50 text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 flex-shrink-0"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                </button>
              </div>
            </NeoCard>

            {/* Code Generator & API Documentation */}
            <NeoCard glowColor="cyan" className="p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center space-x-2">
                <Code className="text-neon-cyan w-5 h-5" />
                <span>API Connection Code Generator</span>
              </h2>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="text-slate-400 font-bold mb-1">1. Place Order API Request (`cURL`)</div>
                  <pre className="bg-slate-950 p-4 border border-[#1e1e38] rounded-xl text-emerald-400 font-mono overflow-x-auto">
{`curl -X POST https://chhayheng.online/api/reseller \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "order",
    "apiKey": "${resellerData.apiKey}",
    "productId": "1"
  }'`}
                  </pre>
                </div>

                <div>
                  <div className="text-slate-400 font-bold mb-1">2. Response Payload (Instant Credentials Delivery)</div>
                  <pre className="bg-slate-950 p-4 border border-[#1e1e38] rounded-xl text-neon-cyan font-mono overflow-x-auto">
{`{
  "success": true,
  "message": "Order placed successfully",
  "order": {
    "id": "ord_991283",
    "productName": "Nitro Discord 3 Month",
    "price": 2.00,
    "status": "Completed",
    "deliverables": "https://discord.gift/nitro-gift-link-1122-3344"
  },
  "remainingBalance": 23.00
}`}
                  </pre>
                </div>
              </div>
            </NeoCard>

            {/* Wholesale Products Catalog */}
            <NeoCard glowColor="purple" className="p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center space-x-2">
                <ShoppingBag className="text-amber-400 w-5 h-5" />
                <span>Wholesale Product Catalog (20% Wholesale Price)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map(p => (
                  <div key={p.id} className="p-4 bg-slate-950 border border-[#1e1e38] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400 font-semibold font-mono">ID: {p.id}</div>
                      <div className="text-sm font-bold text-slate-100 mt-0.5">{p.name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Retail: <span className="line-through">${p.retailPrice}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-amber-400">${p.wholesalePrice}</div>
                      <div className="text-[10px] text-emerald-400 font-bold">{p.stockCount} left in stock</div>
                    </div>
                  </div>
                ))}
              </div>
            </NeoCard>

            {/* Reseller Order History */}
            <NeoCard glowColor="pink" className="p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center space-x-2">
                <Layers className="text-neon-pink w-5 h-5" />
                <span>API Order History ({resellerData.orders.length})</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1e1e38] text-slate-400 font-semibold">
                      <th className="pb-3">Order ID</th>
                      <th className="pb-3">Product</th>
                      <th className="pb-3">Price</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Deliverables</th>
                      <th className="pb-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e38]/50">
                    {resellerData.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-900/50">
                        <td className="py-3 font-mono text-slate-200">{o.id}</td>
                        <td className="py-3 font-bold text-slate-100">{o.productName}</td>
                        <td className="py-3 text-amber-400 font-bold">${o.price}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.status === 'Completed' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 text-neon-cyan font-mono text-[11px] max-w-xs truncate">{o.deliverables || '-'}</td>
                        <td className="py-3 text-right text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {resellerData.orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">No API orders placed yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </NeoCard>
          </div>
        )}
      </div>

      {/* Top Up Balance Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#04040d] border border-[#1e1e38] rounded-2xl p-6 max-w-md w-full space-y-5">
            <h3 className="text-xl font-bold text-slate-100">Top Up Reseller Balance</h3>
            
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 20, 50].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTopUpAmount(amt)}
                  className={`py-2 text-xs font-bold rounded-lg border ${topUpAmount === amt ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 border-[#1e1e38] text-slate-300'}`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            {!qrCodeUrl ? (
              <button
                onClick={() => handleCreateActivationQR(topUpAmount, true)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs rounded-xl"
              >
                GENERATE ${topUpAmount} KHQR
              </button>
            ) : (
              <div className="text-center space-y-3">
                <img src={qrCodeUrl} alt="PayWay KHQR" className="w-56 h-56 mx-auto bg-white p-2 rounded-xl" />
                <div className="text-xs text-amber-400 font-bold">{paymentStatusText}</div>
              </div>
            )}

            <button
              onClick={() => {
                setShowTopUpModal(false);
                setQrCodeUrl('');
              }}
              className="w-full py-2 bg-slate-900 border border-[#1e1e38] text-slate-400 text-xs rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
