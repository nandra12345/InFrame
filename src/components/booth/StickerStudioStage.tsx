'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBoothStore } from '@/store/useBoothStore';
import { PlacedSticker, StickerManifestItem, CandidFilter } from '@/types/booth';
import stickersData from '@/data/stickers.json';
import { removeBackgroundInBrowser } from '@/utils/clientBgRemover';
import { sounds } from '@/utils/audio';
import {
  ArrowLeft,
  Printer,
  Trash2,
  RotateCw,
  Layers,
  Upload,
  Sparkles,
  Ticket,
  Clapperboard,
  Star,
  Plus,
  Copy,
  ZoomIn,
  ZoomOut,
  Check,
  MousePointer,
} from 'lucide-react';

type DrawerTab = 'tickets' | 'props' | 'badges' | 'custom';

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

export const StickerStudioStage: React.FC = () => {
  const {
    selectedFrame,
    photos,
    selectedFilter,
    customBgColor,
    customFooterText,
    stickers,
    selectedStickerId,
    addSticker,
    updateSticker,
    duplicateSticker,
    removeSticker,
    clearStickers,
    bringStickerToFront,
    setSelectedStickerId,
    setStep,
  } = useBoothStore();

  const [activeTab, setActiveTab] = useState<DrawerTab>('tickets');
  const [customStickers, setCustomStickers] = useState<StickerManifestItem[]>([]);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSticker = stickers.find((s) => s.id === selectedStickerId) || null;

  // Pointer drag manipulation state
  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    mode: 'move' | 'resize' | 'rotate';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origScale: number;
    origRotation: number;
  } | null>(null);

  const handlePointerDown = (
    e: React.PointerEvent,
    id: string,
    mode: 'move' | 'resize' | 'rotate'
  ) => {
    e.stopPropagation();
    setSelectedStickerId(id);

    const targetSticker = stickers.find((s) => s.id === id);
    if (!targetSticker) return;

    setActiveDrag({
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: targetSticker.x,
      origY: targetSticker.y,
      origScale: targetSticker.scale,
      origRotation: targetSticker.rotation,
    });
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!activeDrag || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = (e.clientX - activeDrag.startX) / rect.width;
      const deltaY = (e.clientY - activeDrag.startY) / rect.height;

      if (activeDrag.mode === 'move') {
        updateSticker(activeDrag.id, {
          x: Math.max(0.04, Math.min(0.96, activeDrag.origX + deltaX)),
          y: Math.max(0.04, Math.min(0.96, activeDrag.origY + deltaY)),
        });
      } else if (activeDrag.mode === 'resize') {
        const pixelDelta = e.clientX - activeDrag.startX;
        const scaleFactor = 1 + pixelDelta / 140;
        const nextScale = Math.max(0.3, Math.min(3.2, activeDrag.origScale * scaleFactor));
        updateSticker(activeDrag.id, { scale: Number(nextScale.toFixed(2)) });
      } else if (activeDrag.mode === 'rotate') {
        const pixelDelta = e.clientX - activeDrag.startX;
        const nextRot = (activeDrag.origRotation + pixelDelta * 1.5) % 360;
        updateSticker(activeDrag.id, { rotation: Math.round(nextRot) });
      }
    },
    [activeDrag, updateSticker]
  );

  const handlePointerUp = useCallback(() => {
    setActiveDrag(null);
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Desktop Mouse Wheel Zoom / Scaling on Sticker
  const handleWheel = (e: React.WheelEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const target = stickers.find((s) => s.id === id);
    if (!target) return;

    const zoomStep = e.deltaY < 0 ? 0.08 : -0.08;
    const nextScale = Math.max(0.3, Math.min(3.2, Number((target.scale + zoomStep).toFixed(2))));
    updateSticker(id, { scale: nextScale });
  };

  // Desktop Keyboard Shortcuts (Arrow keys nudge, Delete/Backspace remove, Esc deselect, brackets rotate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedStickerId) return;

      // Don't intercept if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const target = stickers.find((s) => s.id === selectedStickerId);
      if (!target) return;

      const nudgeStep = e.shiftKey ? 0.03 : 0.01;

      switch (e.key) {
        case 'Backspace':
        case 'Delete':
          e.preventDefault();
          removeSticker(selectedStickerId);
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedStickerId(null);
          break;
        case 'ArrowUp':
          e.preventDefault();
          updateSticker(selectedStickerId, { y: Math.max(0.04, target.y - nudgeStep) });
          break;
        case 'ArrowDown':
          e.preventDefault();
          updateSticker(selectedStickerId, { y: Math.min(0.96, target.y + nudgeStep) });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          updateSticker(selectedStickerId, { x: Math.max(0.04, target.x - nudgeStep) });
          break;
        case 'ArrowRight':
          e.preventDefault();
          updateSticker(selectedStickerId, { x: Math.min(0.96, target.x + nudgeStep) });
          break;
        case '[':
          e.preventDefault();
          updateSticker(selectedStickerId, { rotation: (target.rotation - 15 + 360) % 360 });
          break;
        case ']':
          e.preventDefault();
          updateSticker(selectedStickerId, { rotation: (target.rotation + 15) % 360 });
          break;
        case '+':
        case '=':
          e.preventDefault();
          updateSticker(selectedStickerId, {
            scale: Math.min(3.2, Number((target.scale + 0.1).toFixed(2))),
          });
          break;
        case '-':
        case '_':
          e.preventDefault();
          updateSticker(selectedStickerId, {
            scale: Math.max(0.3, Number((target.scale - 0.1).toFixed(2))),
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStickerId, stickers, updateSticker, removeSticker, setSelectedStickerId]);

  // Add sticker from catalog
  const handleSelectSticker = (stk: StickerManifestItem) => {
    sounds.playPop();
    addSticker(stk.id, stk.src, 1.0);
  };

  // Upload Custom Sticker + Client-side BG Removal
  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsRemovingBg(true);
      const transparentDataUrl = await removeBackgroundInBrowser(file);
      const newCustomItem: StickerManifestItem = {
        id: `custom-${Date.now()}`,
        name: 'Custom Sticker',
        category: 'custom',
        src: transparentDataUrl,
      };

      setCustomStickers((prev) => [newCustomItem, ...prev]);
      handleSelectSticker(newCustomItem);
    } catch (err) {
      console.warn('Background removal error:', err);
    } finally {
      setIsRemovingBg(false);
      e.target.value = '';
    }
  };

  const catalogStickers = (stickersData as unknown) as StickerManifestItem[];
  const displayedStickers =
    activeTab === 'custom'
      ? customStickers
      : catalogStickers.filter((s) => {
          if (activeTab === 'tickets') return s.category === 'tickets' || s.category === 'signs';
          if (activeTab === 'props') return s.category === 'props';
          if (activeTab === 'badges') return s.category === 'badges';
          return true;
        });

  return (
    <div
      onClick={() => setSelectedStickerId(null)}
      className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-3 py-1.5 max-w-4xl mx-auto w-full select-none"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between w-full mb-1">
        <button
          onClick={() => setStep('STEP_FRAME')}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cinema-muted hover:text-cinema-cream transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Frame</span>
        </button>

        <div className="text-center">
          <span className="text-[10px] font-mono text-cinema-gold uppercase tracking-widest flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-cinema-ember animate-pulse" />
            <span>Stage 04 • Sticker & Decoration Studio</span>
          </span>
          <p className="text-[11px] text-cinema-muted">
            Tap stickers below. Drag, pinch, or use keyboard/wheel on desktop to adjust.
          </p>
        </div>

        <button
          onClick={() => setStep('STEP_EXPORT')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-cinema-red to-cinema-ember text-cinema-cream text-xs font-bold shadow-md shadow-cinema-red/30 hover:scale-105 active:scale-95 transition-all"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Photostrip 🖨️</span>
        </button>
      </div>

      {/* Main Interactive Canvas Area with Guaranteed Responsive Explicit Dimensions */}
      <div className="w-full flex-1 flex items-center justify-center py-1 min-h-[350px]">
        <div
          ref={containerRef}
          className="relative rounded-2xl overflow-hidden shadow-2xl transition-all h-[46vh] sm:h-[52vh] max-h-[500px] min-h-[340px] w-auto border-2 border-theater-border shadow-black/80 flex items-center justify-center"
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
                {photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt={`Cut ${slot.id}`}
                    className="w-full h-full object-cover transition-all duration-300"
                    style={{
                      filter: getFilterStyle(selectedFilter),
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Layer 2: Authentic Transparent Frame Overlay */}
          {selectedFrame.overlayUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedFrame.overlayUrl}
              alt={selectedFrame.name}
              className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
            />
          )}

          {/* Layer 3: Interactive Gallery-Style Placed Stickers */}
          {stickers.map((stk) => {
            const isSelected = selectedStickerId === stk.id;
            return (
              <div
                key={stk.id}
                onPointerDown={(e) => handlePointerDown(e, stk.id, 'move')}
                onWheel={(e) => handleWheel(e, stk.id)}
                className="absolute z-20 cursor-move touch-none"
                style={{
                  left: `${stk.x * 100}%`,
                  top: `${stk.y * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${stk.rotation}deg) scale(${stk.scale})`,
                  zIndex: isSelected ? 40 : 20 + stk.zIndex,
                }}
              >
                {/* Sticker Graphic */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stk.src}
                  alt="Sticker"
                  draggable={false}
                  className="max-w-[85px] sm:max-w-[115px] h-auto pointer-events-none drop-shadow-xl"
                />

                {/* Active Selection Gallery Bounding Box & Tactile Handles */}
                {isSelected && (
                  <>
                    {/* Clean Minimalist Bounding Box (Gallery Style) */}
                    <div className="absolute -inset-2 border-2 border-cinema-gold rounded-xl pointer-events-none shadow-[0_0_12px_rgba(229,184,105,0.4)]">
                      {/* Four subtle corner markers */}
                      <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-cinema-gold rounded-full" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cinema-gold rounded-full" />
                      <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-cinema-gold rounded-full" />
                      <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-cinema-gold rounded-full" />
                    </div>

                    {/* Floating Quick Action Pill directly above sticker */}
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-theater-dark/95 border border-cinema-gold/60 shadow-2xl backdrop-blur-md pointer-events-auto whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSticker(stk.id, {
                            rotation: (stk.rotation + 15) % 360,
                          });
                        }}
                        title="Rotate +15°"
                        className="p-1 rounded-full text-cinema-cream hover:bg-theater-surface hover:text-cinema-gold transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSticker(stk.id, {
                            scale: Math.max(0.3, Number((stk.scale - 0.1).toFixed(2))),
                          });
                        }}
                        title="Scale Down (-)"
                        className="p-1 rounded-full text-cinema-cream hover:bg-theater-surface hover:text-cinema-gold transition-colors"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSticker(stk.id, {
                            scale: Math.min(3.2, Number((stk.scale + 0.1).toFixed(2))),
                          });
                        }}
                        title="Scale Up (+)"
                        className="p-1 rounded-full text-cinema-cream hover:bg-theater-surface hover:text-cinema-gold transition-colors"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateSticker(stk.id);
                        }}
                        title="Duplicate"
                        className="p-1 rounded-full text-cinema-cream hover:bg-theater-surface hover:text-cinema-gold transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          bringStickerToFront(stk.id);
                        }}
                        title="Bring to Front"
                        className="p-1 rounded-full text-cinema-cream hover:bg-theater-surface hover:text-cinema-gold transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-[1px] h-3.5 bg-theater-border mx-0.5" />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSticker(stk.id);
                        }}
                        title="Delete (Del)"
                        className="p-1 rounded-full text-cinema-ember hover:bg-cinema-red hover:text-white transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Fluid Drag Resize Handle on Bottom-Right */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, stk.id, 'resize')}
                      title="Drag to resize"
                      className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-cinema-gold text-theater-dark flex items-center justify-center shadow-lg cursor-se-resize hover:scale-125 transition-transform pointer-events-auto"
                    >
                      <Sparkles className="w-3 h-3" />
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Footer Text */}
          {customFooterText && (
            <div className="absolute bottom-1.5 left-0 right-0 text-center pointer-events-none z-10 px-2">
              <span className="text-[8px] sm:text-[10px] font-bold font-mono tracking-wider text-cinema-gold drop-shadow-md uppercase">
                {customFooterText}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Helper Pill */}
      <div className="hidden sm:flex items-center gap-2 py-1 px-3 rounded-full bg-theater-dark/60 border border-theater-border text-[10px] font-mono text-cinema-muted mb-1">
        <MousePointer className="w-3 h-3 text-cinema-gold" />
        <span>Desktop Shortcuts: Wheel to Zoom • Arrows to Nudge • Delete to Remove • Esc to Deselect</span>
      </div>

      {/* QUICK ADJUSTMENT TOOLBAR (Shows precise numerical sliders when a sticker is active) */}
      {selectedSticker && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-theater-dark border border-cinema-gold/40 rounded-2xl px-3 py-1.5 mb-2 flex items-center justify-between gap-3 shadow-xl shadow-cinema-gold/10"
        >
          {/* Scale Slider */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-cinema-muted">Size:</span>
            <button
              onClick={() =>
                updateSticker(selectedSticker.id, {
                  scale: Math.max(0.3, Number((selectedSticker.scale - 0.1).toFixed(2))),
                })
              }
              className="p-1 rounded bg-theater-surface text-cinema-cream border border-theater-border hover:border-cinema-gold"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <input
              type="range"
              min="0.3"
              max="2.5"
              step="0.05"
              value={selectedSticker.scale}
              onChange={(e) =>
                updateSticker(selectedSticker.id, { scale: parseFloat(e.target.value) })
              }
              className="w-16 sm:w-24 accent-cinema-gold cursor-pointer"
            />
            <button
              onClick={() =>
                updateSticker(selectedSticker.id, {
                  scale: Math.min(3.2, Number((selectedSticker.scale + 0.1).toFixed(2))),
                })
              }
              className="p-1 rounded bg-theater-surface text-cinema-cream border border-theater-border hover:border-cinema-gold"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono text-cinema-gold min-w-[28px]">
              {selectedSticker.scale}x
            </span>
          </div>

          {/* Rotation Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-cinema-muted hidden sm:inline">Rotate:</span>
            <button
              onClick={() =>
                updateSticker(selectedSticker.id, {
                  rotation: (selectedSticker.rotation - 15 + 360) % 360,
                })
              }
              className="px-2 py-0.5 rounded bg-theater-surface text-cinema-cream border border-theater-border text-[10px] font-mono hover:border-cinema-gold"
            >
              -15°
            </button>
            <button
              onClick={() =>
                updateSticker(selectedSticker.id, {
                  rotation: (selectedSticker.rotation + 15) % 360,
                })
              }
              className="px-2 py-0.5 rounded bg-theater-surface text-cinema-cream border border-theater-border text-[10px] font-mono hover:border-cinema-gold"
            >
              +15°
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => duplicateSticker(selectedSticker.id)}
              title="Duplicate"
              className="p-1.5 rounded-lg bg-theater-surface border border-theater-border text-cinema-cream hover:border-cinema-gold transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => bringStickerToFront(selectedSticker.id)}
              title="Bring to Front"
              className="p-1.5 rounded-lg bg-theater-surface border border-theater-border text-cinema-cream hover:border-cinema-gold transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => removeSticker(selectedSticker.id)}
              title="Delete"
              className="p-1.5 rounded-lg bg-cinema-red/20 border border-cinema-red/40 text-cinema-ember hover:bg-cinema-red hover:text-white transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSelectedStickerId(null)}
              title="Done Editing"
              className="p-1.5 rounded-lg bg-cinema-gold text-theater-dark font-bold hover:scale-105 transition-transform"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Categorized Sticker Drawer */}
      <div className="w-full bg-theater-surface/95 border border-theater-border rounded-2xl p-2.5 backdrop-blur-md">
        {/* Drawer Tabs */}
        <div className="flex items-center justify-between border-b border-theater-border pb-1.5 mb-1.5">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'tickets'
                  ? 'bg-theater-elevated text-cinema-gold border border-cinema-gold/40 shadow-sm'
                  : 'text-cinema-muted hover:text-cinema-cream'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Tickets & Signs</span>
            </button>

            <button
              onClick={() => setActiveTab('props')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'props'
                  ? 'bg-theater-elevated text-cinema-gold border border-cinema-gold/40 shadow-sm'
                  : 'text-cinema-muted hover:text-cinema-cream'
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5" />
              <span>Cinema Props</span>
            </button>

            <button
              onClick={() => setActiveTab('badges')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'badges'
                  ? 'bg-theater-elevated text-cinema-gold border border-cinema-gold/40 shadow-sm'
                  : 'text-cinema-muted hover:text-cinema-cream'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Badges & Stars</span>
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'custom'
                  ? 'bg-theater-elevated text-cinema-gold border border-cinema-gold/40 shadow-sm'
                  : 'text-cinema-muted hover:text-cinema-cream'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Custom Upload</span>
            </button>
          </div>

          {/* Quick Clear All */}
          {stickers.length > 0 && (
            <button
              onClick={clearStickers}
              className="text-[10px] font-mono text-cinema-muted hover:text-cinema-red transition-colors whitespace-nowrap ml-2"
            >
              Clear All ({stickers.length})
            </button>
          )}
        </div>

        {/* Sticker Horizontal Tray */}
        <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-1 h-18 no-scrollbar">
          {/* Upload Custom Sticker Button */}
          {activeTab === 'custom' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCustomUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isRemovingBg}
                className="flex-shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-cinema-gold/50 bg-theater-dark flex flex-col items-center justify-center gap-1 text-cinema-gold hover:bg-theater-elevated transition-colors"
              >
                {isRemovingBg ? (
                  <span className="text-[9px] font-mono animate-pulse">Removing BG...</span>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span className="text-[9px] font-mono">Upload</span>
                  </>
                )}
              </button>
            </>
          )}

          {displayedStickers.map((stk) => (
            <button
              key={stk.id}
              onClick={() => handleSelectSticker(stk)}
              className="flex-shrink-0 w-16 h-16 rounded-xl p-1 bg-theater-dark/80 border border-theater-border hover:border-cinema-gold hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stk.src}
                alt={stk.name}
                className="max-w-full max-h-full object-contain pointer-events-none"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
