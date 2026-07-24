import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

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
  image?: string;
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
  deliverables?: string;
  requirements?: string;
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
const DB_FILE = path.join(DB_DIR, 'database.db');

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Connect to SQLite Database
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

// Initialize Key-Value Table for Document Storage
db.exec(`
  CREATE TABLE IF NOT EXISTS json_store (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

let isInitialized = false;

export function initDB() {
  if (isInitialized) return;
  
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM json_store');
  const countRow = countStmt.get() as { count: number };
  
  if (countRow.count === 0) {
    console.log('Migrating from JSON files to SQLite...');
    
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

    const defaultUsers: User[] = [
      {
        email: 'Chhayheng@gmail.com',
        passwordHash: 'Heng@1188',
        role: 'admin'
      }
    ];

    const defaultCategories: string[] = [
      'Telegram Bot',
      'Discord Bot',
      'Web Development',
      'Software Tool',
      'Digital Product'
    ];
    
    const defaultSettings: Settings = {
      botToken: '8982796633:AAE8ZUg0F45RUG1MNEvk5WKmKL-X4KRLIXA',
      groupId: '-100000000',
      khqrLink: 'https://example.com/khqr.jpg'
    };

    const collections = [
      { key: 'categories', file: 'categories.json', defaultData: defaultCategories },
      { key: 'settings', file: 'settings.json', defaultData: defaultSettings },
      { key: 'users', file: 'users.json', defaultData: defaultUsers },
      { key: 'products', file: 'products.json', defaultData: defaultProducts },
      { key: 'orders', file: 'orders.json', defaultData: defaultOrders },
      { key: 'coupons', file: 'coupons.json', defaultData: [] },
      { key: 'verifications', file: 'verifications.json', defaultData: [] }
    ];

    const insertStmt = db.prepare('INSERT INTO json_store (key, value) VALUES (?, ?)');
    
    for (const col of collections) {
      const filePath = path.join(DB_DIR, col.file);
      let jsonData = JSON.stringify(col.defaultData);
      
      // Migrate exact data from old JSON if it exists!
      if (fs.existsSync(filePath)) {
        try {
          jsonData = fs.readFileSync(filePath, 'utf-8');
          console.log(`Migrated ${col.file} to SQLite`);
        } catch(e) {}
      }
      insertStmt.run(col.key, jsonData);
    }
  }
  isInitialized = true;
}

function getValue<T>(key: string): T {
  initDB();
  const stmt = db.prepare('SELECT value FROM json_store WHERE key = ?');
  const row = stmt.get(key) as { value: string } | undefined;
  if (!row) throw new Error(`Database key ${key} not found`);
  return JSON.parse(row.value) as T;
}

function setValue<T>(key: string, value: T): void {
  initDB();
  const stmt = db.prepare('INSERT OR REPLACE INTO json_store (key, value) VALUES (?, ?)');
  stmt.run(key, JSON.stringify(value));
}

export function getCategories(): string[] { return getValue<string[]>('categories'); }
export function saveCategories(categories: string[]): void { setValue('categories', categories); }

export function getSettings(): Settings { return getValue<Settings>('settings'); }
export function saveSettings(settings: Settings): void { setValue('settings', settings); }

export function getUsers(): User[] { return getValue<User[]>('users'); }
export function saveUsers(users: User[]): void { setValue('users', users); }

export function getProducts(): Product[] { return getValue<Product[]>('products'); }
export function saveProducts(products: Product[]): void { setValue('products', products); }

export function getOrders(): Order[] { return getValue<Order[]>('orders'); }
export function saveOrders(orders: Order[]): void { setValue('orders', orders); }

export function getCoupons(): Coupon[] { return getValue<Coupon[]>('coupons'); }
export function saveCoupons(coupons: Coupon[]): void { setValue('coupons', coupons); }

export function getVerifications(): Verification[] { return getValue<Verification[]>('verifications'); }
export function saveVerifications(verifications: Verification[]): void { setValue('verifications', verifications); }

// Authentication Config
export const ADMIN_AUTH = {
  email: 'Chhayheng@gmail.com',
  password: 'Heng@1188'
};
