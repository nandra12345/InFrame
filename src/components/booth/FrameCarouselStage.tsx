'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useBoothStore } from '@/store/useBoothStore';
import { FrameConfig, CandidFilter } from '@/types/booth';
import framesData from '@/data/frames.json';
import { ArrowLeft, ArrowRight, Palette, Type, Sparkles, Camera } from 'lucide-react';

const presetColors = [
  { name: 'Theater Dark', hex: '#180D0E' },
  { name: 'Theater Surface', hex: '#271416' },
  { name: 'In Frame Red', hex: '#B22722' },
  { name: 'In Frame Ember', hex: '#D1342E' },
  { name: 'Blush Cream', hex: '#F5EBEC' },
  { name: 'Marquee Gold', hex: '#E5B869' },
  { name: 'Noir Black', hex: '#111111' },
  { name: 'Deep Burgundy', hex: '#381C1E' },
];

const categoryTabs = [
  { id: 'all', label: 'All Frames' },
  { id: 'Cinema', label: 'Cinema & Marquee 🎬' },
  { id: 'Vintage', label: 'Vintage 90s & Tape 📼' },
  { id: 'Scrapbook', label: 'Scrapbook & Y2K 💾' },
  { id: 'Polaroid', label: 'Polaroid OneStep 📸' },
];

function getFilterStyle(filter: CandidFilter): string {
  switch (filter) {
    case 'cpm35':
      return 'contrast(1.15) brightness(1.08) saturate(1.05) sepia(0.08) hue-rotate(-5deg)';
    case 'blur-gabiiidd':
      return 'contrast(1.05) brightness(1.12) saturate(1.15) sepia(0.12) hue-rotate(-8deg)';
    case 'diffusion-ii':
      return 'contrast(0.95) brightness(1.15) saturate(0.85) sepia(0.15) hue-rotate(20deg)';
    case 'light-grunge':
      return 'contrast(1.35) brightness(0.92) saturate(1.18) sepia(0.25) hue-rotate(-12deg)';
    case 'noir-classic':
      return 'grayscale(1) contrast(1.30) brightness(0.96)';
    case 'warm-candid':
      return 'sepia(0.18) saturate(1.15) contrast(1.08) brightness(1.02)';
    default:
      return 'none';
  }
}

export const FrameCarouselStage: React.FC = () => {
  const {
    selectedFrame,
    photos,
    selectedFilter,
    customBgColor,
    customFooterText,
    setSelectedFrame,
    setCustomBgColor,
    setCustomFooterText,
    loadDemoPhotos,
    setStep,
  } = useBoothStore();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const carouselRef = useRef<HTMLDivElement>(null);

  const allFrames = (framesData as unknown) as FrameConfig[];

  const filteredFrames = allFrames.filter((f) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'Cinema') return f.category === 'Cinema';
    if (activeCategory === 'Vintage') return f.category === 'Vintage 90s';
    if (activeCategory === 'Scrapbook') return f.category === 'Scrapbook' || f.category === 'Y2K Retro';
    if (activeCategory === 'Polaroid') return f.category === 'Polaroid';
    return true;
  });

  // Check if photos exist
  const hasPhotos = Object.keys(photos).length > 0;

  // Auto-fill demo photos if none exist so preview is never blank
  useEffect(() => {
    if (!hasPhotos) {
      loadDemoPhotos();
    }
  }, [hasPhotos, loadDemoPhotos]);

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-2 max-w-4xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full mb-1">
        <button
          onClick={() => setStep('STEP_CAPTURE')}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cinema-muted hover:text-cinema-cream transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Camera</span>
        </button>

        <div className="text-center">
          <span className="text-[10px] font-mono text-cinema-gold uppercase tracking-widest flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-cinema-ember animate-pulse" />
            <span>Stage 03 • Live Frame Preview</span>
          </span>
          <h2 className="text-base md:text-lg font-bold text-cinema-cream font-display">
            {selectedFrame.name}
          </h2>
        </div>

        <button
          onClick={() => setStep('STEP_STICKER')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-cinema-red to-cinema-ember text-cinema-cream text-xs font-bold shadow-md shadow-cinema-red/30 hover:scale-105 active:scale-95 transition-all"
        >
          <span>Next: Stickers</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Photostrip Live Preview Area with GUARANTEED EXPLICIT DIMENSIONS */}
      <div className="w-full flex-1 flex items-center justify-center py-2 min-h-[380px]">
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 h-[50vh] sm:h-[56vh] max-h-[540px] min-h-[350px] w-auto border-2 border-theater-border shadow-black/80 flex items-center justify-center"
          style={{
            aspectRatio: `${selectedFrame.aspectRatio || 0.5627}`,
            backgroundColor: customBgColor || selectedFrame.backgroundColor || '#160D0C',
          }}
        >
          {/* Layer 1: Captured Photos Fitted Perfectly in Each Slot */}
          {selectedFrame.slots.map((slot) => {
            const photoUrl =
              photos[slot.id] ||
              photos[((slot.id - 1) % Math.max(1, Object.keys(photos).length)) + 1] ||
              photos[1];

            return (
              <div
                key={slot.id}
                className="absolute overflow-hidden bg-theater-dark flex items-center justify-center"
                style={{
                  left: `${slot.x * 100}%`,
                  top: `${slot.y * 100}%`,
                  width: `${slot.w * 100}%`,
                  height: `${slot.h * 100}%`,
                }}
              >
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt={`Pose ${slot.id}`}
                    className="w-full h-full object-cover transition-all duration-300"
                    style={{
                      filter: getFilterStyle(selectedFilter),
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-cinema-muted text-[10px] font-mono p-2 text-center">
                    <Camera className="w-4 h-4 text-cinema-gold mb-1 opacity-70" />
                    <span>Slot #{slot.id}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Layer 2: Transparent Authentic Frame Overlay Image */}
          {selectedFrame.overlayUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedFrame.overlayUrl}
              alt={selectedFrame.name}
              className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
            />
          )}

          {/* Layer 4: Custom Footer Caption */}
          {customFooterText && (
            <div className="absolute bottom-1.5 left-0 right-0 text-center pointer-events-none z-10 px-2">
              <span className="text-[8px] sm:text-[10px] font-bold font-mono tracking-wider text-cinema-gold drop-shadow-md uppercase">
                {customFooterText}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Frame Selection Tray & Customization Bar */}
      <div className="w-full bg-theater-surface/90 border border-theater-border rounded-2xl p-2.5 backdrop-blur-md">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2 no-scrollbar border-b border-theater-border">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1 rounded-xl text-[11px] font-mono whitespace-nowrap transition-all ${
                activeCategory === tab.id
                  ? 'bg-cinema-ember text-cinema-cream font-bold shadow-md shadow-cinema-ember/30'
                  : 'text-cinema-muted hover:text-cinema-cream bg-theater-dark/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Horizontal Frame Snap Carousel */}
        <div
          ref={carouselRef}
          className="flex items-center gap-3 overflow-x-auto py-1 px-1 w-full no-scrollbar scroll-smooth"
        >
          {filteredFrames.map((frame) => {
            const isSelected = selectedFrame.id === frame.id;
            return (
              <button
                key={frame.id}
                onClick={() => setSelectedFrame(frame)}
                className={`relative flex-shrink-0 flex flex-col items-center p-1.5 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'border-cinema-gold bg-theater-elevated shadow-lg shadow-cinema-gold/25 scale-105'
                    : 'border-theater-border bg-theater-surface hover:border-cinema-gold/40'
                }`}
              >
                <div
                  className="w-16 h-28 rounded-lg overflow-hidden bg-theater-dark border border-theater-border flex items-center justify-center relative mb-1"
                  style={{ backgroundColor: frame.backgroundColor }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={frame.thumbnailUrl || frame.overlayUrl}
                    alt={frame.name}
                    className="w-full h-full object-contain p-0.5"
                  />
                </div>
                <span className="text-[10px] font-bold text-cinema-cream max-w-[85px] truncate text-center">
                  {frame.name}
                </span>
                <span className="text-[8px] font-mono text-cinema-gold">
                  {frame.cutCount}-Cut
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Color & Caption Inputs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-theater-border mt-1.5">
          {/* Preset Color Picker */}
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-cinema-gold flex-shrink-0" />
            <div className="flex items-center gap-1 overflow-x-auto">
              {presetColors.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setCustomBgColor(c.hex)}
                  title={c.name}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    customBgColor === c.hex
                      ? 'scale-125 border-cinema-cream shadow-md'
                      : 'border-white/20 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Footer Text Input */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
            <Type className="w-3.5 h-3.5 text-cinema-muted flex-shrink-0" />
            <input
              type="text"
              value={customFooterText}
              onChange={(e) => setCustomFooterText(e.target.value)}
              placeholder="Custom footer caption..."
              maxLength={35}
              className="w-full bg-theater-dark border border-theater-border rounded-xl px-2.5 py-1 text-xs text-cinema-cream focus:outline-none focus:border-cinema-gold font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
