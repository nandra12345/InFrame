'use client';

import React from 'react';
import { useBoothStore } from '@/store/useBoothStore';
import { LayoutMode } from '@/types/booth';
import { Film, Sparkles, Camera } from 'lucide-react';

const layoutOptions: {
  id: LayoutMode;
  title: string;
  subtitle: string;
  cutCount: number;
  ratio: string;
  tag?: string;
}[] = [
  {
    id: '3-cut',
    title: '3-Cut Vertical Cinema Strip',
    subtitle: 'Hollywood Marquee, 90s Tape & Polaroid Formats',
    cutCount: 3,
    ratio: '1 : 1.78',
    tag: 'GEN-Z FAVORITE ⭐',
  },
  {
    id: '4-cut',
    title: '4-Cut Classic Photostrip',
    subtitle: 'Cinema Scrapbook, Tartan Plaid & Retro Digicam Formats',
    cutCount: 4,
    ratio: '1 : 1.78',
    tag: 'POPULAR 🎞️',
  },
];

export const LayoutStage: React.FC = () => {
  const { layout, setLayout, setStep } = useBoothStore();

  const handleStart = () => {
    setStep('STEP_CAPTURE');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 py-8 max-w-3xl mx-auto">
      {/* Title & Gen-Z Marquee Badge */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-theater-surface border border-cinema-gold/30 text-cinema-gold text-xs font-mono uppercase tracking-widest mb-3">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Stage 01 • Booth Setup</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-cinema-cream uppercase tracking-wider font-display">
          Select Your <span className="text-cinema-ember">Photostrip</span> Format
        </h1>
        <p className="text-cinema-muted text-sm md:text-base mt-2 max-w-lg mx-auto">
          Choose your photo session length. Authentic self-booth experience with vintage candid filters and cinema frames.
        </p>
      </div>

      {/* Layout Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-10 max-w-2xl">
        {layoutOptions.map((opt) => {
          const isSelected = layout === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setLayout(opt.id)}
              className={`relative flex flex-col items-center p-6 rounded-2xl border text-left transition-all duration-300 ${
                isSelected
                  ? 'bg-theater-elevated border-cinema-gold shadow-lg shadow-cinema-gold/20 scale-[1.02]'
                  : 'bg-theater-surface border-theater-border hover:border-cinema-gold/40 hover:bg-theater-elevated/60'
              }`}
            >
              {opt.tag && (
                <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-cinema-red text-cinema-cream shadow">
                  {opt.tag}
                </span>
              )}

              {/* Graphical Layout Mockup */}
              <div className="w-24 h-48 bg-theater-dark border-2 border-dashed border-cinema-gold/40 rounded-lg p-2 mb-4 flex flex-col justify-between items-center">
                {opt.id === '3-cut' && (
                  <div className="w-full h-full flex flex-col justify-between gap-1.5">
                    <div className="w-full flex-1 bg-theater-surface rounded border border-cinema-ember/30" />
                    <div className="w-full flex-1 bg-theater-surface rounded border border-cinema-ember/30" />
                    <div className="w-full flex-1 bg-theater-surface rounded border border-cinema-ember/30" />
                  </div>
                )}
                {opt.id === '4-cut' && (
                  <div className="w-full h-full flex flex-col justify-between gap-1">
                    <div className="w-full flex-1 bg-theater-surface rounded border border-cinema-gold/30" />
                    <div className="w-full flex-1 bg-theater-surface rounded border border-cinema-gold/30" />
                    <div className="w-full flex-1 bg-theater-surface rounded border border-cinema-gold/30" />
                    <div className="w-full flex-1 bg-theater-surface rounded border border-cinema-gold/30" />
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="flex items-center gap-2 mb-1 w-full justify-center">
                <Film className="w-5 h-5 text-cinema-gold" />
                <span className="font-bold text-cinema-cream text-base">{opt.title}</span>
              </div>
              <p className="text-cinema-muted text-xs text-center mb-3">{opt.subtitle}</p>

              <div className="flex items-center justify-between w-full pt-3 border-t border-theater-border text-xs text-cinema-muted font-mono">
                <span>{opt.cutCount} Shots</span>
                <span className="text-cinema-gold font-bold">{opt.ratio}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full bg-gradient-to-r from-cinema-red to-cinema-ember text-cinema-cream font-bold text-base md:text-lg shadow-xl shadow-cinema-red/30 hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <Camera className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
        <span>Enter Photobooth 🎬</span>
      </button>
    </div>
  );
};
