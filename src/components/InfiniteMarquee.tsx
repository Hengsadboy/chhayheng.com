'use client';

import React from 'react';

interface LogoItem {
  name: string;
  icon: React.ReactNode;
}

export default function InfiniteMarquee() {
  const logos: LogoItem[] = [
    {
      name: 'CapCut',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2">
          <path d="M12 2L2 12l10 10 10-10L12 2zm-1 4.5v11L5.5 12 11 6.5zm2 0L18.5 12 13 17.5v-11z" fill="#00f2fe" fillOpacity="0.2"/>
        </svg>
      )
    },
    {
      name: 'Netflix',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#E50914">
          <path d="M5.998 2H9.04l5.96 15.116V2h3.003v20H14.96L9 6.885V22H5.998z"/>
        </svg>
      )
    },
    {
      name: 'YouTube',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#FF0000">
          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.388.511a3.002 3.002 0 0 0-2.11 2.107C0 8.048 0 12 0 12s0 3.952.502 5.837a3.002 3.002 0 0 0 2.11 2.107c1.883.511 9.388.511 9.388.511s7.505 0 9.388-.511a3.002 3.002 0 0 0 2.11-2.107c.502-1.885.502-5.837.502-5.837s0-3.952-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    },
    {
      name: 'Canva',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="url(#canvaGradient)" />
          <defs>
            <linearGradient id="canvaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00c4cc" />
              <stop offset="100%" stopColor="#7d2ae8" />
            </linearGradient>
          </defs>
        </svg>
      )
    },
    {
      name: 'Adobe',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#FF0000">
          <path d="M13.966 2H22v19.986h-4.321l-3.327-5.597h-4.707l-2.484 5.597H3L10.744 2h3.222zm-3.87 9.877h3.842l-1.93-3.238-1.912 3.238z"/>
        </svg>
      )
    },
    {
      name: 'SuperGrok',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h8M12 8v8" />
        </svg>
      )
    },
    {
      name: 'Cursor',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
          <path d="M12 2l8 8-8 8-8-8 8-8zm0 4.5L7.5 11 12 15.5 16.5 11 12 6.5z" fill="url(#cursorGradient)" />
          <defs>
            <linearGradient id="cursorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
        </svg>
      )
    },
    {
      name: 'Discord',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#5865F2">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
        </svg>
      )
    }
  ];

  const duplicatedLogos = [...logos, ...logos, ...logos, ...logos];

  return (
    <div className="w-full py-1 overflow-hidden relative select-none">
      {/* Dynamic left and right fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#04040d] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#04040d] to-transparent z-10 pointer-events-none" />

      {/* Infinite scrolling marquee running from left to right */}
      <div className="flex w-max animate-marquee-reverse">
        {duplicatedLogos.map((logo, idx) => (
          <div
            key={idx}
            className="flex items-center space-x-3 mx-10 hover:scale-108 transition-all duration-300 cursor-default"
          >
            <div className="flex-shrink-0">
              {logo.icon}
            </div>
            <span className="text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors">
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
