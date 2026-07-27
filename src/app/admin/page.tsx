'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Settings, Plus, Edit2, Trash2, ShoppingCart, 
  Layers, Package, Check, Save, X, Edit, HardDrive, RefreshCw,
  TrendingUp, DollarSign, Activity, Briefcase, Users, MessageSquare, Sparkles, Wand2, Gift, Trophy, PartyPopper
} from 'lucide-react';
import NeoCard from '@/components/NeoCard';

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
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

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

export default function AdminPortal() {
  const [session, setSession] = useState<{ email: string; role: string } | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    description: '',
    price: 99,
    category: 'Telegram Bot',
    features: [''],
    deliveryTime: '3-5 Days',
    stockAccounts: [],
    image: '',
    requiresInput: false,
    inputLabel: '',
    inputPlaceholder: ''
  });

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<Order['status']>('Pending');
  const [deliverablesText, setDeliverablesText] = useState('');

  // Dynamic Categories State
  const [categories, setCategories] = useState<string[]>(['Telegram Bot', 'Discord Bot', 'Web Development', 'Software Tool', 'Digital Product']);

  // Bot Settings State
  const [settings, setSettings] = useState({ botToken: '', groupId: '', khqrLink: '' });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Coupons State
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(10);
  
  // Broadcast & Users State
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [websiteUsers, setWebsiteUsers] = useState<any[]>([]);
  const [tgUsers, setTgUsers] = useState<any[]>([]);

  // AI Description Generator State
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const handleGenerateAi = async (productName: string, isEditing = false) => {
    if (!productName) {
      alert('Please enter a Product Name first!');
      return;
    }
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
        body: JSON.stringify({ productName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (isEditing && editingProduct) {
            setEditingProduct({
              ...editingProduct,
              description: data.description,
              features: data.features && data.features.length > 0 ? data.features : editingProduct.features
            });
          } else {
            setNewProduct({
              ...newProduct,
              description: data.description,
              features: data.features && data.features.length > 0 ? data.features : newProduct.features
            });
          }
        }
      }
    } catch (err) {
      console.error('AI Generation failed', err);
    }
    setIsGeneratingAi(false);
  };

  // Giveaways State
  const [adminGiveaways, setAdminGiveaways] = useState<any[]>([]);
  const [gwTitle, setGwTitle] = useState('');
  const [gwDesc, setGwDesc] = useState('');
  const [gwPrize, setGwPrize] = useState('');
  const [gwWinnerCount, setGwWinnerCount] = useState(1);
  const [gwDurationHours, setGwDurationHours] = useState(24);

  // UI view state - Default to the new Salary/Revenue Analytics tab
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'orders' | 'users' | 'giveaways' | 'settings' | 'coupons' | 'broadcast'>('analytics');

  useEffect(() => {
    const stored = localStorage.getItem('user_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.role === 'admin') {
        setSession(parsed);
        fetchAdminData();
      }
    }
  }, []);

  const getAdminKey = () => {
    if (session?.token) return session.token;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.token) return parsed.token;
        } catch (e) {}
      }
    }
    return 'Heng@1188';
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) setCategories(await res.json());
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const adminKey = getAdminKey();
      const [prodRes, ordRes, setRes, coupRes, userRes, gwRes] = await Promise.all([
        fetch('/api/products', { headers: { 'x-admin-key': adminKey } }),
        fetch('/api/orders', { headers: { 'x-admin-key': adminKey } }),
        fetch('/api/settings', { headers: { 'x-admin-key': adminKey } }),
        fetch('/api/coupons', { headers: { 'x-admin-key': adminKey } }),
        fetch('/api/users', { headers: { 'x-admin-key': adminKey } }),
        fetch('/api/giveaway', { headers: { 'x-admin-key': adminKey } })
      ]);
      
      if (prodRes.ok) setProducts(await prodRes.json());
      if (ordRes.ok) setOrders(await ordRes.json());
      if (setRes.ok) setSettings(await setRes.json());
      if (coupRes.ok) setCoupons(await coupRes.json());
      if (userRes.ok) {
        const uData = await userRes.json();
        if (uData.success) {
          setWebsiteUsers(uData.websiteUsers || []);
          setTgUsers(uData.tgUsers || []);
        }
      }
      if (gwRes.ok) {
        const gData = await gwRes.json();
        if (gData.success) setAdminGiveaways(gData.giveaways || []);
      }
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signin', email: emailInput, password: passwordInput })
      });
      const data = await res.json();

      if (res.ok && data.success && data.user.role === 'admin') {
        const adminSession = { email: data.user.email, role: 'admin', token: passwordInput };
        localStorage.setItem('user_session', JSON.stringify(adminSession));
        setSession(adminSession);
        setLoginError('');
        fetchAdminData();
        window.dispatchEvent(new Event('session_changed'));
      } else {
        setLoginError('Invalid Administrator credentials.');
      }
    } catch {
      setLoginError('Server error during login.');
    }
  };

  // Product CRUD Handlers
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
        body: JSON.stringify({
          ...newProduct,
          features: newProduct.features.filter(f => f.trim() !== '')
        })
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewProduct({
          name: '',
          description: '',
          price: 99,
          category: 'Telegram Bot',
          features: [''],
          deliveryTime: '3-5 Days',
          stockAccounts: [],
          image: ''
        });
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
        body: JSON.stringify({
          ...editingProduct,
          features: editingProduct.features.filter(f => f.trim() !== '')
        })
      });
      if (res.ok) {
        setEditingProduct(null);
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': getAdminKey() }
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Order Status Handler
  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingOrderId) return;

    try {
      const res = await fetch(`/api/orders/${updatingOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
        body: JSON.stringify({
          status: updateStatus,
          deliverables: deliverablesText
        })
      });
      if (res.ok) {
        setUpdatingOrderId(null);
        setDeliverablesText('');
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startOrderUpdate = (order: Order) => {
    setUpdatingOrderId(order.id);
    setUpdateStatus(order.status);
    setDeliverablesText(order.deliverables || '');
  };

  // 1. Calculate cumulative revenue coordinates for the SVG Salary Growth Chart
  const nonCancelledOrders = orders
    .filter(o => o.status !== 'Cancelled')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let totalRevenue = 0;
  const growthPoints = nonCancelledOrders.map((o, idx) => {
    totalRevenue += o.price;
    return {
      x: idx,
      y: totalRevenue,
      date: new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      price: o.price,
      product: o.productName
    };
  });

  const maxVal = totalRevenue || 100;
  const svgWidth = 600;
  const svgHeight = 240;
  const paddingX = 40;
  const paddingY = 20;

  // Generate polyline path
  const linePath = growthPoints.length > 0
    ? growthPoints.map((pt, idx) => {
        const xPos = paddingX + (idx / Math.max(1, growthPoints.length - 1)) * (svgWidth - paddingX * 2);
        const yPos = svgHeight - paddingY - (pt.y / maxVal) * (svgHeight - paddingY * 2);
        return `${xPos},${yPos}`;
      }).join(' ')
    : '';

  // Forecast calculator
  const activeOrdersCount = orders.filter(o => o.status === 'In Progress' || o.status === 'Pending').length;
  const completedOrdersCount = orders.filter(o => o.status === 'Completed').length;

  if (!session) {
    return (
      <div className="max-w-md mx-auto my-20 px-6">
        <NeoCard glowColor="purple" className="p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-neon-purple" />
            <span>Admin Portal Login</span>
          </h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            {loginError && <p className="text-xs text-rose-500">{loginError}</p>}
            <button type="submit" className="w-full py-2 bg-gradient-to-r from-neon-purple to-neon-pink text-slate-950 font-bold text-xs uppercase tracking-wider rounded">
              Sign In
            </button>
          </form>
        </NeoCard>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-[#1e1e38]">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 flex items-center space-x-2">
            <Settings className="w-7 h-7 text-neon-purple" />
            <span>Admin Portal</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Logged in: <span className="text-neon-purple font-bold">{session.email}</span></p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={fetchAdminData}
            className="p-2 rounded bg-slate-900 border border-[#1e1e38] hover:border-neon-cyan/50 text-slate-300 hover:text-neon-cyan transition-all"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('user_session');
              setSession(null);
              window.dispatchEvent(new Event('session_changed'));
            }}
            className="px-3.5 py-1.5 bg-slate-900 border border-[#1e1e38] hover:border-neon-pink/50 text-slate-300 hover:text-neon-pink text-xs font-semibold rounded-md transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs including Salary Growth Dashboard */}
      <div className="flex space-x-4 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all border ${activeTab === 'analytics' ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-slate-950 border-none glow-purple' : 'bg-slate-900 border-[#1e1e38] text-slate-400 hover:text-slate-200'}`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Salary & Revenue Growth</span>
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all border ${activeTab === 'products' ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-slate-950 border-none glow-cyan' : 'bg-slate-900 border-[#1e1e38] text-slate-400 hover:text-slate-200'}`}
        >
          <Package className="w-4 h-4" />
          <span>Products Manager</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all border ${activeTab === 'orders' ? 'bg-gradient-to-r from-neon-pink to-neon-purple text-slate-950 border-none glow-purple' : 'bg-slate-900 border-[#1e1e38] text-slate-400 hover:text-slate-200'}`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Incoming Orders ({orders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all border ${activeTab === 'users' ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-none glow-cyan' : 'bg-slate-900 border-[#1e1e38] text-slate-400 hover:text-slate-200'}`}
        >
          <Users className="w-4 h-4" />
          <span>Users ({websiteUsers.length + tgUsers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('giveaways')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all border ${activeTab === 'giveaways' ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-none glow-cyan' : 'bg-slate-900 border-[#1e1e38] text-slate-400 hover:text-slate-200'}`}
        >
          <Gift className="w-4 h-4" />
          <span>Giveaways ({adminGiveaways.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all border ${activeTab === 'settings' ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-slate-950 border-none glow-blue' : 'bg-slate-900 border-[#1e1e38] text-slate-400 hover:text-slate-200'}`}
        >
          <Settings className="w-4 h-4" />
          <span>Bot Config</span>
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all border ${activeTab === 'coupons' ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 border-none glow-cyan' : 'bg-slate-900 border-[#1e1e38] text-slate-400 hover:text-slate-200'}`}
        >
          <Check className="w-4 h-4" />
          <span>Coupons</span>
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all border ${activeTab === 'broadcast' ? 'bg-gradient-to-r from-rose-400 to-orange-500 text-slate-950 border-none glow-pink' : 'bg-slate-900 border-[#1e1e38] text-slate-400 hover:text-slate-200'}`}
        >
          <Activity className="w-4 h-4" />
          <span>Announce</span>
        </button>
      </div>

      {/* Content views */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Top Growth Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <NeoCard glowColor="purple" className="p-5 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Salary / Earnings</div>
                <div className="text-3xl font-black text-slate-100 mt-1">${totalRevenue.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
                <DollarSign className="w-6 h-6 text-neon-purple" />
              </div>
            </NeoCard>

            <NeoCard glowColor="cyan" className="p-5 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Completed Orders</div>
                <div className="text-3xl font-black text-slate-100 mt-1">{completedOrdersCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20">
                <Check className="w-6 h-6 text-neon-cyan" />
              </div>
            </NeoCard>

            <NeoCard glowColor="blue" className="p-5 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">In Progress & Pending</div>
                <div className="text-3xl font-black text-slate-100 mt-1">{activeOrdersCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-neon-blue/10 border border-neon-blue/20">
                <Activity className="w-6 h-6 text-neon-blue" />
              </div>
            </NeoCard>

            <NeoCard glowColor="pink" className="p-5 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Client Profiles</div>
                <div className="text-3xl font-black text-slate-100 mt-1">
                  {new Set(orders.map(o => o.customerEmail)).size}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-neon-pink/10 border border-neon-pink/20">
                <Briefcase className="w-6 h-6 text-neon-pink" />
              </div>
            </NeoCard>
          </div>

          {/* Interactive SVG Revenue Growth Graph */}
          <NeoCard glowColor="purple" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-100">Cumulative Revenue Timeline</h3>
                <p className="text-xs text-slate-500 mt-0.5">Chronological summation of paid developer service orders</p>
              </div>
              <span className="text-[10px] font-bold text-neon-purple uppercase tracking-wider bg-neon-purple/5 border border-neon-purple/20 px-2.5 py-1 rounded-md animate-pulse">
                Live updates
              </span>
            </div>

            {growthPoints.length < 2 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                Not enough sales data yet to render the cumulative timeline. Place orders to populate points!
              </div>
            ) : (
              <div className="relative">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const y = paddingY + ratio * (svgHeight - paddingY * 2);
                    const label = Math.floor(maxVal - ratio * maxVal);
                    return (
                      <g key={i}>
                        <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="#1e1e38" strokeWidth="0.5" strokeDasharray="3 3" />
                        <text x={paddingX - 10} y={y + 4} fill="#64748b" fontSize="8" textAnchor="end">${label}</text>
                      </g>
                    );
                  })}

                  {/* Gradient Area under line */}
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9d4edd" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#04040d" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Area fill path */}
                  {growthPoints.length > 0 && (
                    <path
                      d={`M ${paddingX},${svgHeight - paddingY} L ${linePath} L ${paddingX + (growthPoints.length - 1) / Math.max(1, growthPoints.length - 1) * (svgWidth - paddingX * 2)},${svgHeight - paddingY} Z`}
                      fill="url(#areaGradient)"
                    />
                  )}

                  {/* Line Drawing */}
                  <polyline
                    fill="none"
                    stroke="url(#lineGrad)"
                    strokeWidth="3.5"
                    points={linePath}
                  />

                  {/* Point highlights */}
                  {growthPoints.map((pt, idx) => {
                    const cx = paddingX + (idx / Math.max(1, growthPoints.length - 1)) * (svgWidth - paddingX * 2);
                    const cy = svgHeight - paddingY - (pt.y / maxVal) * (svgHeight - paddingY * 2);
                    return (
                      <g key={idx} className="group cursor-pointer">
                        <circle cx={cx} cy={cy} r="5" fill="#04040d" stroke="#9d4edd" strokeWidth="2.5" />
                        <circle cx={cx} cy={cy} r="10" fill="#9d4edd" fillOpacity="0" className="hover:fill-opacity-20 transition-all" />
                        
                        {/* Hover Tooltip Card overlay (SVG) */}
                        <g className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                          <rect x={cx - 50} y={cy - 48} width="100" height="38" rx="4" fill="#0d0d21" stroke="#9d4edd" strokeWidth="1" />
                          <text x={cx} y={cy - 36} fill="#f8fafc" fontSize="8" fontWeight="bold" textAnchor="middle">{pt.date}</text>
                          <text x={cx} y={cy - 24} fill="#00f2fe" fontSize="8" fontWeight="black" textAnchor="middle">Sum: ${pt.y}</text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Line gradient definitions */}
                  <defs>
                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00f2fe" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#9d4edd" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* X Axis dates legend */}
                <div className="flex justify-between px-[40px] mt-2 text-[10px] text-slate-500 font-bold font-mono">
                  <span>{growthPoints[0].date}</span>
                  {growthPoints.length > 2 && <span>{growthPoints[Math.floor(growthPoints.length / 2)].date}</span>}
                  <span>{growthPoints[growthPoints.length - 1].date}</span>
                </div>
              </div>
            )}
          </NeoCard>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-8">
          <NeoCard glowColor="purple" className="p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <Users className="text-amber-400 w-5 h-5" />
              <span>Registered Website Accounts ({websiteUsers.length})</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1e1e38] text-slate-400 font-semibold">
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Username</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3">Balance</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e38]/50">
                  {websiteUsers.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-900/50">
                      <td className="py-3 text-slate-200 font-medium">{u.email}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'admin' ? 'bg-purple-950 text-purple-300' : u.role === 'reseller' ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{u.username || '-'}</td>
                      <td className="py-3 text-slate-400">{u.phone || '-'}</td>
                      <td className="py-3 text-emerald-400 font-bold">${u.balance || 0}</td>
                      <td className="py-3 text-right">
                        {u.role !== 'admin' && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to delete user ${u.email}?`)) return;
                              const res = await fetch('/api/users', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                                body: JSON.stringify({ type: 'website', email: u.email })
                              });
                              if (res.ok) fetchAdminData();
                            }}
                            className="text-rose-400 hover:text-rose-300 font-bold px-2 py-1 bg-rose-950/40 rounded border border-rose-900/50 hover:bg-rose-900/40 transition-all"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {websiteUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">No website users registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </NeoCard>

          <NeoCard glowColor="cyan" className="p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <MessageSquare className="text-neon-cyan w-5 h-5" />
              <span>Telegram Bot Subscribers ({tgUsers.length})</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1e1e38] text-slate-400 font-semibold">
                    <th className="pb-3">Telegram ID</th>
                    <th className="pb-3">Username</th>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Balance</th>
                    <th className="pb-3">Orders</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e38]/50">
                  {tgUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/50">
                      <td className="py-3 text-slate-200 font-mono">{u.id}</td>
                      <td className="py-3 text-neon-cyan font-semibold">{u.username ? `@${u.username}` : '-'}</td>
                      <td className="py-3 text-slate-300">{`${u.first_name} ${u.last_name}`.trim() || '-'}</td>
                      <td className="py-3 text-emerald-400 font-bold">${u.balance}</td>
                      <td className="py-3 text-slate-400">{u.ordersCount}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={async () => {
                            if (!confirm(`Are you sure you want to delete Telegram subscriber ${u.id}?`)) return;
                            const res = await fetch('/api/users', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                              body: JSON.stringify({ type: 'telegram', id: u.id })
                            });
                            if (res.ok) fetchAdminData();
                          }}
                          className="text-rose-400 hover:text-rose-300 font-bold px-2 py-1 bg-rose-950/40 rounded border border-rose-900/50 hover:bg-rose-900/40 transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tgUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">No Telegram bot subscribers yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </NeoCard>
        </div>
      )}

      {activeTab === 'giveaways' && (
        <div className="space-y-8">
          <NeoCard glowColor="purple" className="p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center space-x-2">
              <Gift className="text-amber-400 w-5 h-5" />
              <span>Create New Promotional Giveaway</span>
            </h2>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!gwTitle || !gwPrize) {
                alert('Title and Prize are required!');
                return;
              }
              try {
                const res = await fetch('/api/giveaway', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                  body: JSON.stringify({
                    action: 'create',
                    title: gwTitle,
                    description: gwDesc,
                    prize: gwPrize,
                    winnerCount: gwWinnerCount,
                    durationHours: gwDurationHours
                  })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                  alert('Giveaway created successfully!');
                  setGwTitle('');
                  setGwDesc('');
                  setGwPrize('');
                  fetchAdminData();
                } else {
                  alert(data.message || data.error || 'Failed to create giveaway.');
                }
              } catch (err) {
                alert('Connection error.');
              }
            }} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Giveaway Title</label>
                  <input
                    type="text"
                    required
                    value={gwTitle}
                    onChange={e => setGwTitle(e.target.value)}
                    placeholder="e.g. Free YouTube Premium 1-Year"
                    className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Prize Name</label>
                  <input
                    type="text"
                    required
                    value={gwPrize}
                    onChange={e => setGwPrize(e.target.value)}
                    placeholder="e.g. 1x YouTube Premium Account"
                    className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description & Rules</label>
                <textarea
                  rows={2}
                  value={gwDesc}
                  onChange={e => setGwDesc(e.target.value)}
                  placeholder="e.g. Click Enter to join! Winner will be picked automatically in 24 hours."
                  className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Number of Winners</label>
                  <input
                    type="number"
                    min={1}
                    value={gwWinnerCount}
                    onChange={e => setGwWinnerCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={gwDurationHours}
                    onChange={e => setGwDurationHours(parseInt(e.target.value) || 24)}
                    className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.01] transition-all"
              >
                + Publish Giveaway
              </button>
            </form>
          </NeoCard>

          {/* Manage Active & Past Giveaways */}
          <NeoCard glowColor="cyan" className="p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center space-x-2">
              <Trophy className="text-neon-cyan w-5 h-5" />
              <span>All Giveaways ({adminGiveaways.length})</span>
            </h2>

            <div className="space-y-4">
              {adminGiveaways.map((gw) => (
                <div key={gw.id} className="p-4 bg-slate-950 border border-[#1e1e38] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${gw.status === 'active' ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                        {gw.status.toUpperCase()}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100">{gw.title}</h3>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Prize: <strong className="text-slate-200">{gw.prize}</strong> | Entries: <strong className="text-amber-400">{gw.entries?.length || 0}</strong></div>
                    {gw.winners && gw.winners.length > 0 && (
                      <div className="text-xs text-emerald-400 font-bold mt-1">🎉 Winner(s): {gw.winners.join(', ')}</div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    {gw.status === 'active' && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Draw random winner(s) for "${gw.title}" now?`)) return;
                          const res = await fetch('/api/giveaway', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                            body: JSON.stringify({ action: 'draw', giveawayId: gw.id })
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            alert(`Winner(s) selected: ${data.winners.join(', ')}`);
                            fetchAdminData();
                          } else {
                            alert(data.message || 'Failed to draw winners.');
                          }
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs rounded hover:glow-cyan transition-all"
                      >
                        🎲 Pick Winner(s)
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        if (!confirm('Are you sure you want to delete this giveaway?')) return;
                        const res = await fetch('/api/giveaway', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                          body: JSON.stringify({ action: 'delete', giveawayId: gw.id })
                        });
                        if (res.ok) fetchAdminData();
                      }}
                      className="px-3 py-1.5 bg-rose-950/60 text-rose-400 border border-rose-900/50 font-bold text-xs rounded hover:bg-rose-900/50 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {adminGiveaways.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">No giveaways created yet.</div>
              )}
            </div>
          </NeoCard>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-2xl">
          <NeoCard glowColor="blue" className="p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center space-x-2">
              <Settings className="text-neon-blue w-5 h-5" />
              <span>Telegram Bot & Payment Configuration</span>
            </h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSettingsSaving(true);
              try {
                const res = await fetch('/api/settings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                  body: JSON.stringify(settings)
                });
                if (res.ok) alert('Settings saved successfully!');
              } catch (err) {
                console.error(err);
                alert('Failed to save settings.');
              }
              setSettingsSaving(false);
            }} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Telegram Bot Token</label>
                <input 
                  type="text" 
                  value={settings.botToken}
                  onChange={(e) => setSettings({ ...settings, botToken: e.target.value })}
                  placeholder="e.g., 123456789:ABCDefGHIJKlmNOPqrsTUVWxyz"
                  className="w-full bg-slate-950/80 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50 transition-all"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">Get this from @BotFather on Telegram.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Notification Group ID</label>
                <input 
                  type="text" 
                  value={settings.groupId}
                  onChange={(e) => setSettings({ ...settings, groupId: e.target.value })}
                  placeholder="e.g., -1001234567890"
                  className="w-full bg-slate-950/80 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50 transition-all"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">The chat ID where the bot should send notifications or process orders.</p>
              </div>



              <div className="pt-4 border-t border-[#1e1e38] flex justify-end">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="bg-neon-blue text-slate-950 px-6 py-2 rounded-md text-xs font-extrabold tracking-wide hover:shadow-[0_0_15px_rgba(77,212,255,0.4)] transition-all disabled:opacity-50"
                >
                  {settingsSaving ? 'SAVING...' : 'SAVE CONFIGURATION'}
                </button>
              </div>
            </form>
          </NeoCard>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="space-y-6 max-w-4xl">
          <NeoCard glowColor="cyan" className="p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center space-x-2">
              <Check className="text-neon-cyan w-5 h-5" />
              <span>Coupon Code Management</span>
            </h2>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newCouponCode) return;
              try {
                const res = await fetch('/api/coupons', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                  body: JSON.stringify({ action: 'create', coupon: { code: newCouponCode, discountPercentage: newCouponDiscount }})
                });
                if (res.ok) {
                  setNewCouponCode('');
                  setNewCouponDiscount(10);
                  fetchAdminData();
                }
              } catch (err) {
                console.error(err);
              }
            }} className="flex items-end space-x-4 mb-8 pb-8 border-b border-[#1e1e38]">
              <div className="flex-grow">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Coupon Code (e.g. SUMMER20)</label>
                <input type="text" value={newCouponCode} onChange={e => setNewCouponCode(e.target.value.toUpperCase())} className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200" required />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Discount %</label>
                <input type="number" min="1" max="100" value={newCouponDiscount} onChange={e => setNewCouponDiscount(Number(e.target.value))} className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200" required />
              </div>
              <button type="submit" className="px-5 py-2 rounded-md bg-emerald-500 text-slate-950 font-bold text-xs h-[34px]">Add Coupon</button>
            </form>

            <div className="space-y-3">
              {coupons.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-900 border border-[#1e1e38] rounded-md">
                  <div>
                    <span className="text-sm font-black text-slate-100">{c.code}</span>
                    <span className="ml-3 text-xs text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded">{c.discountPercentage}% OFF</span>
                  </div>
                  <button onClick={async () => {
                    await fetch('/api/coupons', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                      body: JSON.stringify({ action: 'delete', coupon: c })
                    });
                    fetchAdminData();
                  }} className="text-rose-400 hover:text-rose-300 text-xs font-bold">Delete</button>
                </div>
              ))}
              {coupons.length === 0 && <p className="text-xs text-slate-500">No active coupons.</p>}
            </div>
          </NeoCard>
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="space-y-6 max-w-2xl">
          <NeoCard glowColor="pink" className="p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center space-x-2">
              <Activity className="text-neon-pink w-5 h-5" />
              <span>Broadcast Announcement</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">Send a direct message to ALL users who have started the Telegram Bot.</p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!confirm('Are you sure you want to broadcast this message to all bot users?')) return;
              setIsBroadcasting(true);
              try {
                const res = await fetch('/api/bot/broadcast', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                  body: JSON.stringify({ message: broadcastMessage })
                });
                const data = await res.json();
                if (res.ok) {
                  alert(`Broadcast complete! Sent to ${data.count} users. Failed: ${data.failed}`);
                  setBroadcastMessage('');
                } else {
                  alert(`Error: ${data.error}`);
                }
              } catch (err) {
                alert('Broadcast failed.');
              }
              setIsBroadcasting(false);
            }}>
              <textarea
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder="Type your announcement here... (Markdown supported)"
                rows={6}
                className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-3 text-sm text-slate-200 mb-4"
                required
              />
              <button 
                type="submit" 
                disabled={isBroadcasting}
                className="w-full py-3 rounded-md bg-gradient-to-r from-rose-500 to-orange-500 text-slate-950 font-bold tracking-wide uppercase transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] disabled:opacity-50"
              >
                {isBroadcasting ? 'Broadcasting...' : 'Send Broadcast to All Users'}
              </button>
            </form>
          </NeoCard>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-neon-purple" />
              <span>Catalog Products</span>
            </h2>
            <button
              onClick={() => {
                setNewProduct({ ...newProduct, category: categories.length > 0 ? categories[0] : '' as any });
                setShowAddForm(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-pink text-slate-950 font-bold text-xs rounded transition-all glow-purple"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>

          {/* Add Product Modal Form */}
          <AnimatePresence>
            {showAddForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#020208]/85 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-lg glassmorphism border border-neon-purple/30 rounded-xl p-6 relative max-h-[90vh] overflow-y-auto"
                >
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <h3 className="text-lg font-bold text-slate-100 mb-6">Create New Catalog Service</h3>

                  <form onSubmit={handleAddProduct} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Product Name</label>
                        <input
                          type="text"
                          required
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                          className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-neon-purple/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Category Setting</label>
                        <select
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as any })}
                          className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none"
                        >
                          {!categories.includes(newProduct.category) && (
                            <option value={newProduct.category}>{newProduct.category} (Missing)</option>
                          )}
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Price ($ USD)</label>
                        <input
                          type="number"
                          required
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-neon-purple/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Delivery Time Frame</label>
                        <input
                          type="text"
                          required
                          value={newProduct.deliveryTime}
                          onChange={(e) => setNewProduct({ ...newProduct, deliveryTime: e.target.value })}
                          className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-neon-purple/50"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-slate-400">Description</label>
                        <button
                          type="button"
                          disabled={isGeneratingAi}
                          onClick={() => handleGenerateAi(newProduct.name, false)}
                          className="px-2.5 py-1 bg-gradient-to-r from-neon-purple to-neon-pink text-slate-950 text-[10px] font-black rounded-md hover:glow-purple transition-all flex items-center space-x-1 disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{isGeneratingAi ? 'Generating AI...' : '✨ AI Generate Copy'}</span>
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        required
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-neon-purple/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Key Selling Features</label>
                      {newProduct.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center space-x-2 mb-2">
                          <input
                            type="text"
                            value={feat}
                            onChange={(e) => {
                              const copy = [...newProduct.features];
                              copy[fIdx] = e.target.value;
                              setNewProduct({ ...newProduct, features: copy });
                            }}
                            className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                            placeholder={`Feature ${fIdx + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const copy = newProduct.features.filter((_, idx) => idx !== fIdx);
                              setNewProduct({ ...newProduct, features: copy });
                            }}
                            className="p-2 text-rose-400 hover:bg-slate-900 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setNewProduct({ ...newProduct, features: [...newProduct.features, ''] })}
                        className="text-neon-purple text-xs font-bold hover:underline mt-1"
                      >
                        + Add Feature Row
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Auto-Delivery Stock Accounts</label>
                      <div className="space-y-2">
                        {(newProduct.stockAccounts || []).map((acc, accIdx) => (
                          <div key={accIdx} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={acc}
                              onChange={(e) => {
                                const copy = [...(newProduct.stockAccounts || [])];
                                copy[accIdx] = e.target.value;
                                setNewProduct({ ...newProduct, stockAccounts: copy });
                              }}
                              className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                              placeholder={`Account credentials or link ${accIdx + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const copy = (newProduct.stockAccounts || []).filter((_, idx) => idx !== accIdx);
                                setNewProduct({ ...newProduct, stockAccounts: copy });
                              }}
                              className="p-2 text-rose-400 hover:bg-slate-900 rounded transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewProduct({ ...newProduct, stockAccounts: [...(newProduct.stockAccounts || []), ''] })}
                        className="text-neon-cyan text-xs font-bold hover:underline mt-2 flex items-center space-x-1"
                      >
                        <span>+ Add Stock Account</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Product Image URL (link)</label>
                      <input
                        type="text"
                        value={newProduct.image || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>

                    {/* Custom Customer Detail Box */}
                    <div className="p-3 bg-slate-950/80 border border-[#1e1e38] rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-200">+ Require Customer Input Detail Box</div>
                          <div className="text-[10px] text-slate-400">For Family Group invites, Email targets, or custom instructions</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={newProduct.requiresInput || false}
                          onChange={(e) => setNewProduct({ ...newProduct, requiresInput: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-700 text-neon-purple focus:ring-neon-purple"
                        />
                      </div>

                      {newProduct.requiresInput && (
                        <div className="space-y-2 pt-2 border-t border-[#1e1e38]">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Input Label Title</label>
                            <input
                              type="text"
                              value={newProduct.inputLabel || ''}
                              onChange={(e) => setNewProduct({ ...newProduct, inputLabel: e.target.value })}
                              placeholder="e.g. Enter your Email for YouTube Family Invite"
                              className="w-full bg-slate-900 border border-[#1e1e38] rounded px-3 py-1.5 text-xs text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Input Placeholder Text</label>
                            <input
                              type="text"
                              value={newProduct.inputPlaceholder || ''}
                              onChange={(e) => setNewProduct({ ...newProduct, inputPlaceholder: e.target.value })}
                              placeholder="e.g. yourname@gmail.com"
                              className="w-full bg-slate-900 border border-[#1e1e38] rounded px-3 py-1.5 text-xs text-slate-200"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded bg-gradient-to-r from-neon-purple to-neon-pink text-slate-950 font-bold text-xs uppercase tracking-wider mt-4"
                    >
                      Save Product
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Edit Product Modal Form */}
          <AnimatePresence>
            {editingProduct && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#020208]/85 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-lg glassmorphism border border-neon-cyan/30 rounded-xl p-6 relative max-h-[90vh] overflow-y-auto"
                >
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <h3 className="text-lg font-bold text-slate-100 mb-6">Modify Service Catalog Item</h3>

                  <form onSubmit={handleUpdateProduct} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Product Name</label>
                        <input
                          type="text"
                          required
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                          className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-neon-cyan/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Category Setting</label>
                        <select
                          value={editingProduct.category}
                          onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                          className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none"
                        >
                          {!categories.includes(editingProduct.category) && (
                            <option value={editingProduct.category}>{editingProduct.category} (Missing)</option>
                          )}
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Price ($ USD)</label>
                        <input
                          type="number"
                          required
                          value={editingProduct.price}
                          onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-neon-cyan/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Delivery Time Frame</label>
                        <input
                          type="text"
                          required
                          value={editingProduct.deliveryTime}
                          onChange={(e) => setEditingProduct({ ...editingProduct, deliveryTime: e.target.value })}
                          className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-neon-cyan/50"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-slate-400">Description</label>
                        <button
                          type="button"
                          disabled={isGeneratingAi}
                          onClick={() => handleGenerateAi(editingProduct.name, true)}
                          className="px-2.5 py-1 bg-gradient-to-r from-neon-cyan to-neon-blue text-slate-950 text-[10px] font-black rounded-md hover:glow-cyan transition-all flex items-center space-x-1 disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{isGeneratingAi ? 'Generating AI...' : '✨ AI Generate Copy'}</span>
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        required
                        value={editingProduct.description}
                        onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                        className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-neon-cyan/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Key Selling Features</label>
                      {editingProduct.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center space-x-2 mb-2">
                          <input
                            type="text"
                            value={feat}
                            onChange={(e) => {
                              const copy = [...editingProduct.features];
                              copy[fIdx] = e.target.value;
                              setEditingProduct({ ...editingProduct, features: copy });
                            }}
                            className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const copy = editingProduct.features.filter((_, idx) => idx !== fIdx);
                              setEditingProduct({ ...editingProduct, features: copy });
                            }}
                            className="p-2 text-rose-400 hover:bg-slate-900 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, features: [...editingProduct.features, ''] })}
                        className="text-neon-cyan text-xs font-bold hover:underline mt-1"
                      >
                        + Add Feature Row
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Auto-Delivery Stock Accounts</label>
                      <div className="space-y-2">
                        {(editingProduct.stockAccounts || []).map((acc, accIdx) => (
                          <div key={accIdx} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={acc}
                              onChange={(e) => {
                                const copy = [...(editingProduct.stockAccounts || [])];
                                copy[accIdx] = e.target.value;
                                setEditingProduct({ ...editingProduct, stockAccounts: copy });
                              }}
                              className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                              placeholder={`Account credentials or link ${accIdx + 1} (e.g., user:pass or https://example.com)`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const copy = (editingProduct.stockAccounts || []).filter((_, idx) => idx !== accIdx);
                                setEditingProduct({ ...editingProduct, stockAccounts: copy });
                              }}
                              className="p-2 text-rose-400 hover:bg-slate-900 rounded transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, stockAccounts: [...(editingProduct.stockAccounts || []), ''] })}
                        className="text-neon-cyan text-xs font-bold hover:underline mt-2 flex items-center space-x-1"
                      >
                        <span>+ Add Stock Account</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Product Image URL (link)</label>
                      <input
                        type="text"
                        value={editingProduct.image || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>

                    {/* Custom Customer Detail Box */}
                    <div className="p-3 bg-slate-950/80 border border-[#1e1e38] rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-200">+ Require Customer Input Detail Box</div>
                          <div className="text-[10px] text-slate-400">For Family Group invites, Email targets, or custom instructions</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingProduct.requiresInput || false}
                          onChange={(e) => setEditingProduct({ ...editingProduct, requiresInput: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-700 text-neon-purple focus:ring-neon-purple"
                        />
                      </div>

                      {editingProduct.requiresInput && (
                        <div className="space-y-2 pt-2 border-t border-[#1e1e38]">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Input Label Title</label>
                            <input
                              type="text"
                              value={editingProduct.inputLabel || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, inputLabel: e.target.value })}
                              placeholder="e.g. Enter your Email for YouTube Family Invite"
                              className="w-full bg-slate-900 border border-[#1e1e38] rounded px-3 py-1.5 text-xs text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Input Placeholder Text</label>
                            <input
                              type="text"
                              value={editingProduct.inputPlaceholder || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, inputPlaceholder: e.target.value })}
                              placeholder="e.g. yourname@gmail.com"
                              className="w-full bg-slate-900 border border-[#1e1e38] rounded px-3 py-1.5 text-xs text-slate-200"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded bg-gradient-to-r from-neon-cyan to-neon-blue text-slate-950 font-bold text-xs uppercase tracking-wider mt-4"
                    >
                      Update Product Details
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

           {/* Dynamic Category Manager Card */}
          <NeoCard glowColor="cyan" className="p-5">
            <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-neon-cyan" />
              <span>Manage Store Categories</span>
            </h3>

            {/* Add category form inline */}
            <div className="flex items-center space-x-3 mb-6">
              <input
                type="text"
                placeholder="New category name (e.g. VPS Hosting)..."
                id="new_category_input"
                className="bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-neon-cyan/50 flex-grow"
              />
              <button
                onClick={async () => {
                  const inputEl = document.getElementById('new_category_input') as HTMLInputElement;
                  const catName = inputEl?.value || '';
                  if (!catName.trim()) return;
                  try {
                    const res = await fetch('/api/categories', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                      body: JSON.stringify({ name: catName })
                    });
                    if (res.ok) {
                      inputEl.value = '';
                      fetchCategories();
                    } else {
                      const data = await res.json();
                      alert(data.error || 'Failed to add category');
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-neon-cyan to-neon-blue text-slate-950 font-bold text-xs rounded transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-slate-950" />
                <span>Add Category</span>
              </button>
            </div>

            {/* List of current categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded bg-slate-950 border border-[#1e1e38] text-xs text-slate-300"
                >
                  <span>{cat}</span>
                  <button
                    onClick={async () => {
                      if (!confirm(`Are you sure you want to delete the category "${cat}"? Products under this category might remain visible unless manually updated.`)) return;
                      try {
                         const res = await fetch('/api/categories', {
                           method: 'DELETE',
                           headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                           body: JSON.stringify({ name: cat })
                         });
                         if (res.ok) {
                           fetchCategories();
                         } else {
                           const data = await res.json();
                           alert(data.error || 'Failed to delete category');
                         }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="p-0.5 text-rose-400 hover:text-rose-300 rounded hover:bg-slate-900 transition-colors"
                    title={`Delete ${cat}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </NeoCard>

          {/* Product Items Table List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((p) => (
              <NeoCard key={p.id} glowColor="purple" className="flex flex-col justify-between p-5 h-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono text-neon-purple font-bold uppercase">{p.id}</span>
                    <div className="flex items-center space-x-2">
                      {p.category === 'Digital Product' && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${p.stockAccounts && p.stockAccounts.length > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-rose-950 text-rose-400 border border-rose-500/20'}`}>
                          {p.stockAccounts && p.stockAccounts.length > 0 ? `${p.stockAccounts.length} in stock` : 'out of stock'}
                        </span>
                      )}
                      <span className="text-[9px] font-extrabold uppercase bg-slate-950/80 px-2 py-0.5 rounded text-slate-400 border border-[#1e1e38]">
                        {p.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 mt-1">
                    {p.image && (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-9 h-9 object-cover rounded border border-[#1e1e38] flex-shrink-0"
                      />
                    )}
                    <h3 className="text-base font-extrabold text-slate-100">{p.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-3">{p.description}</p>
                </div>

                <div className="border-t border-[#1e1e38] pt-4 mt-4 flex items-center justify-between">
                  <div className="text-lg font-black text-slate-100">${p.price}</div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="p-2 bg-slate-900 border border-[#1e1e38] hover:border-neon-cyan/50 text-slate-400 hover:text-neon-cyan rounded transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-2 bg-slate-900 border border-[#1e1e38] hover:border-neon-pink/50 text-slate-400 hover:text-neon-pink rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </NeoCard>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-neon-cyan" />
            <span>Customer Orders Overview</span>
          </h2>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <NeoCard glowColor="cyan" className="p-8 text-center text-slate-400 text-xs">
                No orders registered in system.
              </NeoCard>
            ) : (
              orders.map((order) => (
                <NeoCard key={order.id} glowColor="cyan" className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-neon-cyan uppercase">{order.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${order.status === 'Completed' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20' : order.status === 'In Progress' ? 'bg-sky-950/60 text-sky-400 border border-sky-500/20' : order.status === 'Cancelled' ? 'bg-rose-950/60 text-rose-400 border border-rose-500/20' : 'bg-yellow-950/60 text-yellow-400 border border-yellow-500/20'}`}>
                          {order.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-100 mt-1">{order.productName}</h3>
                      <div className="flex items-center space-x-4 mt-1.5 text-[11px] text-slate-400">
                        <div>Client: <span className="text-slate-200">{order.customerEmail}</span></div>
                        <div>Date: <span className="text-slate-200">{new Date(order.createdAt).toLocaleDateString()}</span></div>
                        <div>Price: <span className="text-slate-200 font-bold">${order.price}</span></div>
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => startOrderUpdate(order)}
                        className="w-full md:w-auto px-4 py-2 bg-slate-900 border border-[#1e1e38] hover:border-neon-cyan/50 hover:bg-slate-900/60 text-slate-300 hover:text-neon-cyan text-xs font-bold rounded transition-all"
                      >
                        Manage Status & Setup
                      </button>
                    </div>
                  </div>

                  {order.requirements && (
                    <div className="mt-3 p-3 bg-slate-950/40 border border-[#1e1e38] rounded text-[11px] text-slate-300">
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Client Requirements & Guidelines:
                      </div>
                      <span className="whitespace-pre-wrap leading-relaxed">{order.requirements}</span>
                    </div>
                  )}

                  {order.deliverables && (
                    <div className="mt-3 p-3 bg-slate-950/60 border border-[#1e1e38] rounded text-[11px] font-mono text-slate-400">
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center space-x-1">
                        <HardDrive className="w-3 h-3 text-neon-cyan" />
                        <span>Fulfillment deliverables data:</span>
                      </div>
                      <span className="whitespace-pre-wrap break-all">{order.deliverables}</span>
                    </div>
                  )}
                  {order.status !== 'Completed' && (
                    <div className="mt-4 pt-4 border-t border-[#1e1e38] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="text"
                        placeholder="Paste download link / license key to complete work..."
                        id={`quick_link_${order.id}`}
                        className="bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50 flex-grow"
                      />
                      <button
                        onClick={async () => {
                          const inputEl = document.getElementById(`quick_link_${order.id}`) as HTMLInputElement;
                          const deliverable = inputEl?.value || '';
                          if (!deliverable.trim()) {
                            alert('Please paste a deliverable link or code first.');
                            return;
                          }
                          try {
                            const res = await fetch(`/api/orders/${order.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
                              body: JSON.stringify({
                                status: 'Completed',
                                deliverables: deliverable
                              })
                            });
                            if (res.ok) {
                              fetchAdminData();
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-extrabold text-xs rounded hover:opacity-90 transition-all shadow-md flex items-center justify-center space-x-1.5 flex-shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Fulfill & Send</span>
                      </button>
                    </div>
                  )}
                </NeoCard>
              ))
            )}
          </div>

          {/* Edit Order Modal */}
          <AnimatePresence>
            {updatingOrderId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#020208]/85 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md glassmorphism border border-neon-cyan/30 rounded-xl p-6 relative"
                >
                  <button
                    onClick={() => setUpdatingOrderId(null)}
                    className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <h3 className="text-lg font-bold text-slate-100 mb-6">Fulfill Order: {updatingOrderId}</h3>

                  <form onSubmit={handleUpdateOrder} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Fulfillment Status</label>
                      <select
                        value={updateStatus}
                        onChange={(e) => setUpdateStatus(e.target.value as any)}
                        className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option>Pending</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                        <option>Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Deliverable Files, Links or Keys (Customer Viewable)</label>
                      <textarea
                        rows={4}
                        value={deliverablesText}
                        onChange={(e) => setDeliverablesText(e.target.value)}
                        placeholder="Download link: https://...&#10;License Key: ABCD-1234"
                        className="w-full bg-slate-950 border border-[#1e1e38] rounded-md px-3.5 py-2 text-xs text-slate-200 focus:outline-none font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-md bg-gradient-to-r from-neon-cyan to-neon-blue text-slate-950 font-bold text-xs tracking-wider uppercase transition-all glow-cyan"
                    >
                      Update Order
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
