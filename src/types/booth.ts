export type BoothStep =
  | 'STEP_LAYOUT'
  | 'STEP_CAPTURE'
  | 'STEP_FRAME'
  | 'STEP_STICKER'
  | 'STEP_EXPORT';

export type LayoutMode = '3-cut' | '4-cut';

export type CandidFilter =
  | 'cpm35'
  | 'blur-gabiiidd'
  | 'diffusion-ii'
  | 'light-grunge'
  | 'noir-classic'
  | 'warm-candid'
  | 'none';

export type TrackingEffect = 'none' | 'mustache' | 'doggy' | 'angry';

export interface DetectedFace {
  x: number; // 0.0 - 1.0 normalized
  y: number; // 0.0 - 1.0 normalized
  w: number; // 0.0 - 1.0 normalized
  h: number; // 0.0 - 1.0 normalized
}

export interface FrameSlot {
  id: number;
  x: number; // 0.0 - 1.0 normalized
  y: number; // 0.0 - 1.0 normalized
  w: number; // 0.0 - 1.0 normalized
  h: number; // 0.0 - 1.0 normalized
}

export interface FrameConfig {
  id: string;
  name: string;
  category: string;
  cutCount: number;
  aspectRatio: number;
  canvasWidth: number;
  canvasHeight: number;
  overlayUrl: string;
  thumbnailUrl: string;
  backgroundColor: string;
  slots: FrameSlot[];
}

export interface StickerManifestItem {
  id: string;
  name: string;
  category: string;
  src: string;
  width?: number;
  height?: number;
  defaultWidth?: number;
}

export interface PlacedSticker {
  id: string;
  stickerId: string;
  src: string;
  x: number; // relative to canvas width
  y: number; // relative to canvas height
  scale: number;
  rotation: number; // in degrees
  zIndex: number;
}
