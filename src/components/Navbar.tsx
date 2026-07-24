'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Terminal, Shield, LogOut, LayoutDashboard, User } from 'lucide-react';

export default function Navbar() {
  const [session, setSession] = useState<{ email: string; role: string } | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Read session from localStorage
    const stored = localStorage.getItem('user_session');
    if (stored) {
      setSession(JSON.parse(stored));
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Custom event listener to update navbar session state when logging in/out
    const handleSessionChange = () => {
      const current = localStorage.getItem('user_session');
      setSession(current ? JSON.parse(current) : null);
    };

    window.addEventListener('session_changed', handleSessionChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('session_changed', handleSessionChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    setSession(null);
    window.dispatchEvent(new Event('session_changed'));
    window.location.href = '/';
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#04040d]/85 backdrop-blur-md border-b border-[#1e1e38] py-4' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="p-2 bg-gradient-to-tr from-neon-cyan to-neon-purple rounded-lg glow-purple transition-all duration-300 group-hover:scale-105">
            <Terminal className="w-5 h-5 text-[#04040d]" />
          </div>
          <span className="text-xl font-bold tracking-wider text-slate-100 group-hover:text-neon-cyan transition-colors">
            Chhayheng<span className="text-gradient-cyan-purple font-black">.online</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-sm font-medium text-slate-300 hover:text-neon-cyan transition-colors">
            Home
          </Link>
          <a href="/#services" className="text-sm font-medium text-slate-300 hover:text-neon-cyan transition-colors">
            Services
          </a>
          <Link href="/customer" className="text-sm font-bold text-neon-purple hover:text-neon-pink transition-colors">
            Become a Reseller
          </Link>
          <a href="https://t.me/chhayhengs" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-300 hover:text-[#0088cc] transition-colors flex items-center space-x-1">
            <span>Contact Support</span>
          </a>
        </div>

        <div className="flex items-center space-x-4">
          <a
            href="https://t.me/chhayhengs"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-md bg-slate-950 border border-[#1e1e38] hover:border-[#0088cc]/50 text-slate-400 hover:text-[#0088cc] transition-all flex items-center justify-center glow-cyan"
            title="Contact Telegram: @chhayhengs"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.36-.49.99-.75 3.86-1.68 6.43-2.78 7.72-3.3 3.67-1.48 4.43-1.74 4.93-1.75.11 0 .36.03.52.16.14.11.18.26.2.37.02.12.02.26.01.37z" />
            </svg>
          </a>

          {session ? (
            <div className="flex items-center space-x-4">
              <Link
                href={session.role === 'admin' ? '/admin' : '/customer'}
                className="text-xs font-semibold py-1.5 px-3 rounded-md glassmorphism border border-[#1e1e38] text-slate-300 hover:text-neon-cyan hover:glow-cyan transition-all flex items-center space-x-1"
              >
                {session.role === 'admin' ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-neon-purple" />
                    <span>Admin Panel</span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5 text-neon-cyan" />
                    <span>Dashboard</span>
                  </>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-md hover:bg-slate-800/40 text-slate-400 hover:text-neon-pink transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                href="/customer"
                className="text-sm font-medium text-slate-300 hover:text-neon-cyan transition-colors px-4 py-2 rounded-md border border-[#1e1e38] hover:border-neon-cyan/50 transition-all"
              >
                Client Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
