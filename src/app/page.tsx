'use client';

import React from 'react';
import { useBoothStore } from '@/store/useBoothStore';
import { BoothStep } from '@/types/booth';
import { LayoutStage } from '@/components/booth/LayoutStage';
import { CameraStage } from '@/components/booth/CameraStage';
import { FrameCarouselStage } from '@/components/booth/FrameCarouselStage';
import { StickerStudioStage } from '@/components/booth/StickerStudioStage';
import { ExportStage } from '@/components/booth/ExportStage';
import { Sparkles, Clapperboard } from 'lucide-react';

const steps: { id: BoothStep; label: string }[] = [
  { id: 'STEP_LAYOUT', label: '01 Format' },
  { id: 'STEP_CAPTURE', label: '02 Camera' },
  { id: 'STEP_FRAME', label: '03 Frame' },
  { id: 'STEP_STICKER', label: '04 Stickers' },
  { id: 'STEP_EXPORT', label: '05 Print' },
];

export default function PhotoboothPage() {
  const { step, setStep } = useBoothStore();

  const currentStepIdx = steps.findIndex((s) => s.id === step);

  return (
    <main className="min-h-screen flex flex-col justify-between">
      {/* Top Navigation & Cinema Marquee Header */}
      <header className="w-full bg-theater-surface/90 backdrop-blur-md border-b border-theater-border px-4 py-2.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Brand Badge */}
          <div
            onClick={() => setStep('STEP_LAYOUT')}
            className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/LOGO.png"
              alt="In Frame Photo Booth Logo"
              className="w-9 h-9 rounded-xl object-contain shadow-md border border-theater-border bg-[#F5EBEC] p-0.5"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-wider text-cinema-cream font-display leading-tight">
                IN FRAME
              </span>
              <span className="text-[9px] font-mono text-cinema-gold tracking-widest uppercase leading-none">
                PHOTO BOOTH
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar (Clickable Navigation) */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {steps.map((s, idx) => {
              const isActive = s.id === step;
              const isPast = currentStepIdx > idx;
              return (
                <div key={s.id} className="flex items-center">
                  <button
                    onClick={() => setStep(s.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-mono transition-all duration-300 ${
                      isActive
                        ? 'bg-cinema-ember text-cinema-cream font-bold shadow-md shadow-cinema-ember/30 scale-105'
                        : isPast
                        ? 'bg-theater-elevated text-cinema-gold hover:text-white'
                        : 'text-cinema-muted/60 hover:text-cinema-cream'
                    }`}
                  >
                    <span>{s.label}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <span className="text-cinema-muted/30 text-[10px] mx-1 sm:mx-1.5">
                      ›
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Dynamic Kiosk State Machine Stage */}
      <div className="flex-1 w-full flex items-center justify-center">
        {step === 'STEP_LAYOUT' && <LayoutStage />}
        {step === 'STEP_CAPTURE' && <CameraStage />}
        {step === 'STEP_FRAME' && <FrameCarouselStage />}
        {step === 'STEP_STICKER' && <StickerStudioStage />}
        {step === 'STEP_EXPORT' && <ExportStage />}
      </div>

      {/* In Frame Kiosk Footer */}
      <footer className="w-full py-2.5 px-4 border-t border-theater-border bg-theater-dark/90 text-center text-[10px] font-mono text-cinema-muted flex items-center justify-center gap-3">
        <Sparkles className="w-3.5 h-3.5 text-cinema-gold" />
        <span>KEEP IT CANDID • IN FRAME PHOTO BOOTH • RETRO CINEMA EDITION</span>
        <Sparkles className="w-3.5 h-3.5 text-cinema-gold" />
      </footer>
    </main>
  );
}
