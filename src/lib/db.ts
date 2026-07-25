import fs from 'fs';
import path from 'path';

// Define DB Types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Telegram Bot' | 'Discord Bot' | 'Web Development' | 'Software Tool' | 'Digital Product';
  features: string[];
  deliveryTime: string;
  stockAccounts?: string[];
  stockCount?: number;
  image?: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

export interface Order {
  id: string;
  customerEmail: string;
  productId: string;
  productName: string;
  price: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
  deliverables?: string; // URL or text containing download links/credentials
  requirements?: string; // Custom requirements supplied by client during checkout
}

export interface User {
  email: string;
  passwordHash: string;
  role: 'customer' | 'admin' | 'reseller';
  username?: string;
  phone?: string;
  balance?: number;
  apiKey?: string;
}

export interface Settings {
  botToken: string;
  groupId: string;
  khqrLink: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
}

export interface Verification {
  email: string;
  code: string;
  type: 'signup' | 'reset';
  expiresAt: string;
}

const DB_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DB_DIR, 'products.json');
const ORDERS_FILE = path.join(DB_DIR, 'orders.json');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const CATEGORIES_FILE = path.join(DB_DIR, 'categories.json');
const SETTINGS_FILE = path.join(DB_DIR, 'settings.json');
const COUPONS_FILE = path.join(DB_DIR, 'coupons.json');
const VERIFICATIONS_FILE = path.join(DB_DIR, 'verifications.json');

// Ensure database files exist
function initDB() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Pre-populate with default products if empty
  if (!fs.existsSync(PRODUCTS_FILE)) {
    const defaultProducts: Product[] = [
      {
        id: '1',
        name: 'Premium Telegram Trading Bot',
        description: 'Multi-dex copy-trading bot with instant buy/sell capabilities, custom limit orders, and auto-slippage calculation.',
        price: 299,
        category: 'Telegram Bot',
        features: ['Multichain support (Solana, EVM)', 'Limit orders & Auto-Sniper', 'Copy-trading functionality', 'Anti-MEV protection'],
        deliveryTime: '3-5 Days'
      },
      {
        id: '2',
        name: 'Discord Moderation & Economy Bot',
        description: 'All-in-one Discord bot featuring advanced auto-moderation, XP leveling system, custom mini-games, and fully configurable web dashboard integration.',
        price: 149,
        category: 'Discord Bot',
        features: ['Automated moderation & logs', 'Economy, shop, & daily rewards', 'Custom level cards & XP', 'Web configuration panel'],
        deliveryTime: '2-4 Days'
      },
      {
        id: '3',
        name: 'Premium SaaS Landing Page',
        description: 'Stunning modern responsive landing page built with Next.js, Tailwind CSS, and Framer Motion. Optimized for ultra-fast load times and conversion.',
        price: 599,
        category: 'Web Development',
        features: ['Next.js React Framework', 'Tailwind CSS & Framer Motion', '100% SEO & Core Web Vitals optimized', 'Stripe payment integration ready'],
        deliveryTime: '7-10 Days'
      },
      {
        id: '4',
        name: 'AI Smart Contract Auditor',
        description: 'Desktop software tool that uses local AI models to scan Solidity smart contracts for common security vulnerabilities and optimization suggestions.',
        price: 399,
        category: 'Software Tool',
        features: ['Solidity static analysis scans', 'AI-powered vulnerability detection', 'Gas optimization suggestions', 'PDF report export'],
        deliveryTime: 'Instant Download'
      },
      {
        id: '5',
        name: 'YouTube Premium 1-Year Upgrade',
        description: 'Ad-free YouTube playback, background play, offline downloads, and YouTube Music Premium membership on your own personal account.',
        price: 39,
        category: 'Digital Product',
        features: ['100% Ad-free streaming', 'Background video playback', 'Offline video downloads', 'YouTube Music Premium included'],
        deliveryTime: '1-3 Hours',
        stockAccounts: ['YT_PREMIUM_KEY_A7X2-99L1', 'YT_PREMIUM_KEY_F4D1-00B6'],
        image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=200&auto=format&fit=crop'
      },
      {
        id: '6',
        name: 'Discord Nitro 1-Month Gift Link',
        description: 'Get full Discord Nitro access: 2 server boosts, custom emojis/stickers, HD streaming, profile customization, and 100MB upload limits.',
        price: 5,
        category: 'Digital Product',
        features: ['2 Server Boosts included', 'Custom & animated emojis anywhere', 'HD (1080p 60fps) screen sharing', 'Animated profile avatar & banners'],
        deliveryTime: 'Instant Delivery',
        stockAccounts: ['https://discord.gift/nitro-gift-link-1122-3344', 'https://discord.gift/nitro-gift-link-5566-7788'],
        image: 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=200&auto=format&fit=crop'
      },
      {
        id: '7',
        name: 'Netflix Premium 4K Ultra HD (Shared Account)',
        description: '1 Ultra HD 4K screen on a premium shared Netflix account. Complete with custom private profile pin code.',
        price: 15,
        category: 'Digital Product',
        features: ['Ultra HD 4K Resolution', 'Watch on phone, tablet, laptop or TV', '1 screen access with private PIN', 'Ad-free playback'],
        deliveryTime: '1-2 Hours',
        image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=200&auto=format&fit=crop',
        stockAccounts: [
          'Email: NetflixHeng1@gmail.com | Pass: Heng1188 | Profile: Private PIN: 1188',
          'Email: NetflixHeng2@gmail.com | Pass: Heng8811 | Profile: Private PIN: 8811'
        ]
      }
    ];
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(defaultProducts, null, 2), 'utf-8');
  }

  if (!fs.existsSync(ORDERS_FILE)) {
    // Empty orders database initially
    const defaultOrders: Order[] = [
      {
        id: 'ord_101',
        customerEmail: 'buyer@example.com',
        productId: '4',
        productName: 'AI Smart Contract Auditor',
        price: 399,
        status: 'Completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deliverables: 'Download Link: https://github.com/chhayheng/ai-auditor/releases/download/v1.0.0/ai-auditor.zip\nLicense Key: HEX-9912-AUDIT-AI'
      }
    ];
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(defaultOrders, null, 2), 'utf-8');
  }

  if (!fs.existsSync(USERS_FILE)) {
    // Add default admin user and empty customer database
    const defaultUsers: User[] = [
      {
        email: 'Chhayheng@gmail.com',
        passwordHash: 'Heng@1188', // Simple plain text or simple hash check for this scope
        role: 'admin'
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), 'utf-8');
  }

  if (!fs.existsSync(CATEGORIES_FILE)) {
    const defaultCategories: string[] = [
      'Telegram Bot',
      'Discord Bot',
      'Web Development',
      'Software Tool',
      'Digital Product'
    ];
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(defaultCategories, null, 2), 'utf-8');
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    const defaultSettings: Settings = {
      botToken: '8982796633:AAE8ZUg0F45RUG1MNEvk5WKmKL-X4KRLIXA',
      groupId: '-100000000',
      khqrLink: 'https://example.com/khqr.jpg'
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf-8');
  }

  if (!fs.existsSync(COUPONS_FILE)) {
    fs.writeFileSync(COUPONS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  if (!fs.existsSync(VERIFICATIONS_FILE)) {
    fs.writeFileSync(VERIFICATIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

// In-memory cache to optimize CPU/disk I/O on 1GB VPS
let dbCache: {
  categories?: string[];
  settings?: Settings;
  users?: User[];
  products?: Product[];
  orders?: Order[];
  coupons?: Coupon[];
  verifications?: Verification[];
} = {};

// Read & Write Helpers
export function getCategories(): string[] {
  if (dbCache.categories) return dbCache.categories;
  initDB();
  const data = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
  dbCache.categories = JSON.parse(data);
  return dbCache.categories!;
}

export function saveCategories(categories: string[]): void {
  initDB();
  dbCache.categories = categories;
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf-8');
}

export function getSettings(): Settings {
  if (dbCache.settings) return dbCache.settings;
  initDB();
  const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
  dbCache.settings = JSON.parse(data);
  return dbCache.settings!;
}

export function saveSettings(settings: Settings): void {
  initDB();
  dbCache.settings = settings;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

export function getUsers(): User[] {
  if (dbCache.users) return dbCache.users;
  initDB();
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  dbCache.users = JSON.parse(data);
  return dbCache.users!;
}

export function saveUsers(users: User[]): void {
  initDB();
  dbCache.users = users;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export function getProducts(): Product[] {
  if (dbCache.products) return dbCache.products;
  initDB();
  const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
  dbCache.products = JSON.parse(data);
  return dbCache.products!;
}

export function saveProducts(products: Product[]): void {
  initDB();
  dbCache.products = products;
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
}

export function getOrders(): Order[] {
  if (dbCache.orders) return dbCache.orders;
  initDB();
  const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
  dbCache.orders = JSON.parse(data);
  return dbCache.orders!;
}

export function saveOrders(orders: Order[]): void {
  initDB();
  dbCache.orders = orders;
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

export function getCoupons(): Coupon[] {
  if (dbCache.coupons) return dbCache.coupons;
  initDB();
  const data = fs.readFileSync(COUPONS_FILE, 'utf-8');
  dbCache.coupons = JSON.parse(data);
  return dbCache.coupons!;
}

export function saveCoupons(coupons: Coupon[]): void {
  initDB();
  dbCache.coupons = coupons;
  fs.writeFileSync(COUPONS_FILE, JSON.stringify(coupons, null, 2), 'utf-8');
}

export function getVerifications(): Verification[] {
  if (dbCache.verifications) return dbCache.verifications;
  initDB();
  const data = fs.readFileSync(VERIFICATIONS_FILE, 'utf-8');
  dbCache.verifications = JSON.parse(data);
  return dbCache.verifications!;
}

export function saveVerifications(verifications: Verification[]): void {
  initDB();
  dbCache.verifications = verifications;
  fs.writeFileSync(VERIFICATIONS_FILE, JSON.stringify(verifications, null, 2), 'utf-8');
}

// Authentication Config
export const ADMIN_AUTH = {
  email: 'Chhayheng@gmail.com',
  password: 'Heng@1188'
};

export function verifyAdminRequest(request: Request): boolean {
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === ADMIN_AUTH.password;
}
