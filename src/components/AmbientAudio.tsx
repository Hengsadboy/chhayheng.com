'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function AmbientAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const waveNodeRef = useRef<BiquadFilterNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);

  // Synthesize white noise buffer
  const createNoiseBuffer = (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  const startWaves = () => {
    try {
      // 1. Initialize Audio Context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // 2. White Noise generator for waves
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx);
      noise.loop = true;
      noiseSourceRef.current = noise;

      // 3. BiquadFilter to make it sound like wind/waves (muffled white noise)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      filter.Q.value = 1.0;
      waveNodeRef.current = filter;

      // 4. Gain Node for volume modulation
      const mainGain = ctx.createGain();
      mainGain.gain.value = 0.05; // Keep it low and ambient
      gainNodeRef.current = mainGain;

      // 5. LFO (Low Frequency Oscillator) to modulate the lowpass filter frequency (simulate waves coming and going)
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.12; // Wave cycle speed (approx 8 seconds)
      lfoRef.current = lfo;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 250; // Range of filter modulation

      // Connect LFO -> filter frequency
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Connect noise -> filter -> mainGain -> destination
      noise.connect(filter);
      filter.connect(mainGain);
      mainGain.connect(ctx.destination);

      // Start synthesizers
      noise.start();
      lfo.start();
      setIsPlaying(true);
    } catch (e) {
      console.error('Failed to initialize audio synthesis', e);
    }
  };

  const playPlopSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    try {
      // Synthesize a quick liquid "plop" bubble sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Fast upward frequency sweep
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {
      // Ignore audio glitches
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      // Stop LFO and noise source
      try {
        if (noiseSourceRef.current) noiseSourceRef.current.stop();
        if (lfoRef.current) lfoRef.current.stop();
        if (audioContextRef.current) audioContextRef.current.close();
      } catch (err) {}
      setIsPlaying(false);
    } else {
      startWaves();
      // Wait a tiny moment for context to wake up then plop
      setTimeout(() => playPlopSound(), 50);
    }
  };

  // Add click listener globally to play plops on button clicks
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (!isPlaying) return;
      const target = e.target as HTMLElement;
      // Play sound on button, link, or custom interactive item clicks
      if (
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.closest('button') || 
        target.closest('a')
      ) {
        playPlopSound();
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [isPlaying]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={togglePlayback}
        className={`p-3 rounded-full border glassmorphism hover:scale-110 active:scale-95 transition-all duration-300 shadow-lg ${
          isPlaying 
            ? 'border-neon-cyan/50 text-neon-cyan glow-cyan' 
            : 'border-[#1e1e38] text-slate-400 hover:text-slate-200'
        }`}
        title={isPlaying ? 'Mute Ocean Ambient' : 'Enable Ocean Ambient'}
      >
        {isPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>
    </div>
  );
}
