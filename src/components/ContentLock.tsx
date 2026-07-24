'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Lock } from 'lucide-react';

export default function ContentLock() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // 1. Prevent Right-Click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerWarning();
    };

    // 2. Prevent Copy shortcut (Ctrl+C, Cmd+C) and Copy selections
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerWarning();
    };

    // 3. Prevent DevTools shortcuts: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      if (
        e.key === 'F12' ||
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'i') ||
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'j') ||
        (isCtrlOrCmd && e.key.toLowerCase() === 'u') ||
        (isCtrlOrCmd && e.key.toLowerCase() === 'c')
      ) {
        e.preventDefault();
        triggerWarning();
      }
    };

    const triggerWarning = () => {
      setShowWarning(true);
      // Play a quick synth bubble click audio if browser context allowed it
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch {}
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('keydown', handleKeyDown);

    // Disable CSS text selection globally
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.userSelect = 'auto';
      document.body.style.webkitUserSelect = 'auto';
    };
  }, []);

  // Auto-hide warning after 2.2 seconds
  useEffect(() => {
    if (showWarning) {
      const timer = setTimeout(() => setShowWarning(false), 2200);
      return () => clearTimeout(timer);
    }
  }, [showWarning]);

  return (
    <AnimatePresence>
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none px-4">
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', damping: 12 } }}
            exit={{ scale: 0.9, opacity: 0, y: -10 }}
            className="w-full max-w-sm bg-[#0a0518]/90 border border-neon-pink/45 rounded-2xl p-6 text-center shadow-[0_0_50px_rgba(244,63,94,0.35)] backdrop-blur-md"
          >
            <div className="w-12 h-12 bg-neon-pink/10 border border-neon-pink/30 rounded-full flex items-center justify-center mx-auto mb-4 glow-pink animate-bounce">
              <Lock className="w-6 h-6 text-neon-pink" />
            </div>
            
            <h4 className="text-sm font-black text-slate-100 uppercase tracking-widest text-gradient-animate">
              Copyright Secured
            </h4>
            
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              HENG DEV security protocols active. Copy actions, right-clicks, and inspection shortcuts are locked.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
