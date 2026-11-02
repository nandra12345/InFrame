import { create } from 'zustand';
import {
  BoothStep,
  LayoutMode,
  CandidFilter,
  TrackingEffect,
  FrameConfig,
  PlacedSticker,
} from '@/types/booth';
import framesData from '@/data/frames.json';

interface BoothState {
  step: BoothStep;
  layout: LayoutMode;
  selectedFrame: FrameConfig;
  customBgColor: string;
  customFooterText: string;
  selectedFilter: CandidFilter;
  selectedTracking: TrackingEffect;
  photos: Record<number, string>;
  activeSlot: number;
  isMirror: boolean;
  countdownDuration: number;
  isContinuous: boolean;
  stickers: PlacedSticker[];
  selectedStickerId: string | null;
  finalExportUrl: string | null;

  // Actions
  setStep: (step: BoothStep) => void;
  setLayout: (layout: LayoutMode) => void;
  setSelectedFrame: (frame: FrameConfig) => void;
  setCustomBgColor: (color: string) => void;
  setCustomFooterText: (text: string) => void;
  setSelectedFilter: (filter: CandidFilter) => void;
  setSelectedTracking: (tracking: TrackingEffect) => void;
  setPhoto: (slotId: number, dataUrl: string) => void;
  retakeSlot: (slotId: number) => void;
  clearPhotos: () => void;
  loadDemoPhotos: () => void;
  setActiveSlot: (slotId: number) => void;
  toggleMirror: () => void;
  setCountdownDuration: (duration: number) => void;
  toggleContinuous: () => void;
  addSticker: (stickerId: string, src: string, initialScale?: number) => void;
  updateSticker: (id: string, updates: Partial<PlacedSticker>) => void;
  duplicateSticker: (id: string) => void;
  removeSticker: (id: string) => void;
  clearStickers: () => void;
  bringStickerToFront: (id: string) => void;
  setSelectedStickerId: (id: string | null) => void;
  setFinalExportUrl: (url: string | null) => void;
  resetBooth: () => void;
}

const defaultFrame = (framesData[0] as unknown) as FrameConfig;

// Vintage Candid Demo Photos for testing & instant preview
function generateSampleSvg(num: number, color: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
        <stop offset="100%" style="stop-color:#160D0C;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="600" height="450" fill="url(#grad)" />
    <circle cx="300" cy="180" r="70" fill="#FCF5E8" opacity="0.85" />
    <path d="M 180 360 Q 300 240 420 360 Z" fill="#FCF5E8" opacity="0.85" />
    <text x="300" y="390" font-family="sans-serif" font-weight="bold" font-size="28" fill="#E5B869" text-anchor="middle">POSE 0${num} • ${label}</text>
    <text x="300" y="420" font-family="monospace" font-size="16" fill="#B39899" text-anchor="middle">IN FRAME CANDID MEMORIES</text>
  </svg>`;
  return `data:image/svg+xml;base64,${typeof window !== 'undefined' ? btoa(svg) : Buffer.from(svg).toString('base64')}`;
}

export const useBoothStore = create<BoothState>((set, get) => ({
  step: 'STEP_LAYOUT',
  layout: '3-cut',
  selectedFrame: defaultFrame,
  customBgColor: defaultFrame.backgroundColor || '#180D0E',
  customFooterText: 'KEEP IT CANDID • 2026',
  selectedFilter: 'cpm35',
  selectedTracking: 'none',
  photos: {},
  activeSlot: 1,
  isMirror: true,
  countdownDuration: 3,
  isContinuous: true,
  stickers: [],
  selectedStickerId: null,
  finalExportUrl: null,

  setStep: (step) => set({ step }),

  setLayout: (layout) => {
    let targetFrame = framesData.find((f) => {
      if (layout === '3-cut') return f.cutCount === 3;
      if (layout === '4-cut') return f.cutCount === 4;
      if (layout === '2x2') return f.id === 'candid-grid-2x2';
      return false;
    }) as unknown as FrameConfig;

    if (!targetFrame) {
      targetFrame = defaultFrame;
    }

    set({
      layout,
      selectedFrame: targetFrame,
      customBgColor: targetFrame.backgroundColor || '#160D0C',
    });
  },

  setSelectedFrame: (frame) =>
    set((state) => {
      // Smart photo filling: if frame cutCount is greater than current photos count,
      // copy available photos to fill all slots so preview is never empty!
      const currentPhotos = { ...state.photos };
      const photoKeys = Object.keys(currentPhotos).map(Number);

      if (photoKeys.length > 0) {
        for (let i = 1; i <= frame.cutCount; i++) {
          if (!currentPhotos[i]) {
            const fallbackKey = photoKeys[(i - 1) % photoKeys.length];
            currentPhotos[i] = currentPhotos[fallbackKey];
          }
        }
      }

      return {
        selectedFrame: frame,
        customBgColor: frame.backgroundColor || state.customBgColor,
        photos: currentPhotos,
      };
    }),

  setCustomBgColor: (color) => set({ customBgColor: color }),

  setCustomFooterText: (text) => set({ customFooterText: text }),

  setSelectedFilter: (filter) => set({ selectedFilter: filter }),

  setSelectedTracking: (tracking) => set({ selectedTracking: tracking }),

  setPhoto: (slotId, dataUrl) =>
    set((state) => {
      const nextPhotos = { ...state.photos, [slotId]: dataUrl };
      const cutCount = state.selectedFrame.cutCount;
      const isComplete = Object.keys(nextPhotos).length >= cutCount;

      let nextSlot = slotId + 1;
      if (nextSlot > cutCount) {
        nextSlot = 1;
      }

      return {
        photos: nextPhotos,
        activeSlot: isComplete ? state.activeSlot : nextSlot,
      };
    }),

  loadDemoPhotos: () => {
    const demoPhotos: Record<number, string> = {
      1: generateSampleSvg(1, '#8B2626', 'SMILE'),
      2: generateSampleSvg(2, '#B8860B', 'WINK'),
      3: generateSampleSvg(3, '#4A3B32', 'PEACE'),
      4: generateSampleSvg(4, '#800020', 'CANDID'),
    };
    set({ photos: demoPhotos });
  },

  retakeSlot: (slotId) =>
    set({
      activeSlot: slotId,
      step: 'STEP_CAPTURE',
    }),

  clearPhotos: () => set({ photos: {}, activeSlot: 1 }),

  setActiveSlot: (slotId) => set({ activeSlot: slotId }),

  toggleMirror: () => set((state) => ({ isMirror: !state.isMirror })),

  setCountdownDuration: (duration) => set({ countdownDuration: duration }),

  toggleContinuous: () => set((state) => ({ isContinuous: !state.isContinuous })),

  addSticker: (stickerId, src, initialScale = 1) =>
    set((state) => {
      const maxZ = state.stickers.reduce((max, s) => Math.max(max, s.zIndex), 0);
      const newSticker: PlacedSticker = {
        id: `placed-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        stickerId,
        src,
        x: 0.5,
        y: 0.5,
        scale: initialScale,
        rotation: 0,
        zIndex: maxZ + 1,
      };
      return {
        stickers: [...state.stickers, newSticker],
        selectedStickerId: newSticker.id,
      };
    }),

  updateSticker: (id, updates) =>
    set((state) => ({
      stickers: state.stickers.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  duplicateSticker: (id) =>
    set((state) => {
      const target = state.stickers.find((s) => s.id === id);
      if (!target) return state;
      const maxZ = state.stickers.reduce((max, s) => Math.max(max, s.zIndex), 0);
      const duplicate: PlacedSticker = {
        ...target,
        id: `placed-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        x: Math.min(0.9, target.x + 0.05),
        y: Math.min(0.9, target.y + 0.05),
        zIndex: maxZ + 1,
      };
      return {
        stickers: [...state.stickers, duplicate],
        selectedStickerId: duplicate.id,
      };
    }),

  removeSticker: (id) =>
    set((state) => ({
      stickers: state.stickers.filter((s) => s.id !== id),
      selectedStickerId: state.selectedStickerId === id ? null : state.selectedStickerId,
    })),

  clearStickers: () => set({ stickers: [], selectedStickerId: null }),

  bringStickerToFront: (id) =>
    set((state) => {
      const maxZ = state.stickers.reduce((max, s) => Math.max(max, s.zIndex), 0);
      return {
        stickers: state.stickers.map((s) => (s.id === id ? { ...s, zIndex: maxZ + 1 } : s)),
      };
    }),

  setSelectedStickerId: (id) => set({ selectedStickerId: id }),

  setFinalExportUrl: (url) => set({ finalExportUrl: url }),

  resetBooth: () => {
    set({
      step: 'STEP_LAYOUT',
      layout: '3-cut',
      selectedFrame: defaultFrame,
      customBgColor: defaultFrame.backgroundColor || '#160D0C',
      selectedFilter: 'cpm35',
      selectedTracking: 'none',
      photos: {},
      activeSlot: 1,
      stickers: [],
      selectedStickerId: null,
      finalExportUrl: null,
    });
  },
}));
