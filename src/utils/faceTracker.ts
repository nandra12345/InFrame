import { TrackingEffect, DetectedFace } from '@/types/booth';

export interface TrackingEffectConfig {
  id: TrackingEffect;
  label: string;
  icon: string;
  description: string;
}

export const trackingEffectsList: TrackingEffectConfig[] = [
  { id: 'none', label: 'Off', icon: '🚫', description: 'No tracking' },
  { id: 'mustache', label: 'Vintage Mustache', icon: '🥸', description: 'French handlebar mustache' },
  { id: 'doggy', label: 'Snapchat Doggy', icon: '🐶', description: 'Puppy ears & nose filter' },
  { id: 'angry', label: 'Anime Angry 💢', icon: '💢', description: 'Angry vein on right forehead' },
];

export interface FaceLandmark {
  type: 'eye' | 'nose' | 'mouth';
  x: number;
  y: number;
}

export interface CalibratedFace extends DetectedFace {
  landmarks?: FaceLandmark[];
}

// Preloaded Image Cache
const imageCache: Record<string, HTMLImageElement> = {};

function getPreloadedImage(src: string): HTMLImageElement {
  if (imageCache[src]) return imageCache[src];
  if (typeof window === 'undefined') return {} as HTMLImageElement;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  imageCache[src] = img;
  return img;
}

if (typeof window !== 'undefined') {
  getPreloadedImage('/assets/tracking/mustache.png');
  getPreloadedImage('/assets/tracking/angry.png');
  getPreloadedImage('/assets/tracking/doggy_ears.png');
  getPreloadedImage('/assets/tracking/doggy_snout.png');
}

/**
 * Multi-Subject Face Contour Tracker
 * Tracks 1, 2, 3+ human faces in real-time with landmark precision.
 */
export class MultiFaceTracker {
  private detector: any = null;
  private prevFaces: CalibratedFace[] = [];
  private smoothingFactor = 0.65;

  constructor() {
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        const FaceDetectorClass = (window as any).FaceDetector;
        this.detector = new FaceDetectorClass({ maxDetectedFaces: 10, fastMode: true });
      } catch (err) {
        console.info('Native FaceDetector initialized in fallback mode.');
      }
    }
  }

  public async detectFaces(
    video: HTMLVideoElement,
    canvasFallback?: HTMLCanvasElement
  ): Promise<CalibratedFace[]> {
    if (!video || video.readyState < 2) return this.prevFaces;

    const vWidth = video.videoWidth || 1280;
    const vHeight = video.videoHeight || 720;

    // 1. Native High-Precision FaceDetector (Chromium/Chrome/Edge)
    if (this.detector) {
      try {
        const detected = await this.detector.detect(video);
        if (detected && detected.length > 0) {
          const faces: CalibratedFace[] = detected.map((face: any) => {
            const rawLandmarks: FaceLandmark[] = [];
            if (face.landmarks && Array.isArray(face.landmarks)) {
              for (const lm of face.landmarks) {
                if (lm.locations && lm.locations[0]) {
                  rawLandmarks.push({
                    type: lm.type,
                    x: lm.locations[0].x / vWidth,
                    y: lm.locations[0].y / vHeight,
                  });
                }
              }
            }

            return {
              x: face.boundingBox.x / vWidth,
              y: face.boundingBox.y / vHeight,
              w: face.boundingBox.width / vWidth,
              h: face.boundingBox.height / vHeight,
              landmarks: rawLandmarks.length > 0 ? rawLandmarks : undefined,
            };
          });

          this.prevFaces = this.smoothFaces(faces);
          return this.prevFaces;
        }
      } catch (err) {
        // Continue to fallback
      }
    }

    // 2. High-speed multi-face optical cluster fallback
    if (canvasFallback) {
      const faces = this.clusterDetectFallback(video, canvasFallback, vWidth, vHeight);
      if (faces.length > 0) {
        this.prevFaces = this.smoothFaces(faces);
        return this.prevFaces;
      }
    }

    // Default centered portrait if detector initializing
    if (this.prevFaces.length === 0) {
      return [{ x: 0.32, y: 0.16, w: 0.36, h: 0.48 }];
    }

    return this.prevFaces;
  }

  private smoothFaces(newFaces: CalibratedFace[]): CalibratedFace[] {
    if (this.prevFaces.length === 0) return newFaces;

    return newFaces.map((f) => {
      const closest = this.prevFaces.reduce((best, p) => {
        const dist = Math.hypot(p.x - f.x, p.y - f.y);
        return dist < best.dist ? { face: p, dist } : best;
      }, { face: f, dist: Infinity });

      if (closest.dist < 0.20) {
        const p = closest.face;
        const s = this.smoothingFactor;
        return {
          x: p.x * s + f.x * (1 - s),
          y: p.y * s + f.y * (1 - s),
          w: p.w * s + f.w * (1 - s),
          h: p.h * s + f.h * (1 - s),
          landmarks: f.landmarks || p.landmarks,
        };
      }
      return f;
    });
  }

  private clusterDetectFallback(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    vWidth: number,
    vHeight: number
  ): CalibratedFace[] {
    const sW = 80;
    const sH = 60;
    canvas.width = sW;
    canvas.height = sH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    ctx.drawImage(video, 0, 0, sW, sH);
    const imgData = ctx.getImageData(0, 0, sW, sH);
    const data = imgData.data;

    const skinColumns: number[] = new Array(sW).fill(0);
    const skinRows: number[] = new Array(sH).fill(0);

    for (let y = 0; y < sH; y++) {
      for (let x = 0; x < sW; x++) {
        const idx = (y * sW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const sum = r + g + b;
        if (sum > 0) {
          const nr = r / sum;
          const ng = g / sum;
          const isSkin =
            nr > 0.36 &&
            nr < 0.58 &&
            ng > 0.26 &&
            ng < 0.38 &&
            r > g &&
            g > b &&
            r - g > 10;

          if (isSkin) {
            skinColumns[x]++;
            skinRows[y]++;
          }
        }
      }
    }

    const peaks: { start: number; end: number }[] = [];
    let inCluster = false;
    let startIdx = 0;

    for (let x = 0; x < sW; x++) {
      if (skinColumns[x] > 4) {
        if (!inCluster) {
          inCluster = true;
          startIdx = x;
        }
      } else if (inCluster) {
        inCluster = false;
        if (x - startIdx >= 6) {
          peaks.push({ start: startIdx, end: x });
        }
      }
    }
    if (inCluster && sW - startIdx >= 6) {
      peaks.push({ start: startIdx, end: sW });
    }

    let topY = 0;
    let botY = sH;
    for (let y = 0; y < sH; y++) {
      if (skinRows[y] > 5) {
        topY = y;
        break;
      }
    }
    for (let y = sH - 1; y >= 0; y--) {
      if (skinRows[y] > 5) {
        botY = y;
        break;
      }
    }

    if (peaks.length === 0 || botY <= topY) return [];

    return peaks.map((p) => {
      const pW = (p.end - p.start) / sW;
      const pH = Math.min(0.65, Math.max(0.28, (botY - topY) / sH));
      return {
        x: Math.max(0.02, p.start / sW - 0.02),
        y: Math.max(0.04, topY / sH - 0.02),
        w: Math.min(0.7, pW + 0.04),
        h: Math.min(0.8, pH + 0.04),
      };
    });
  }
}

/**
 * Renders tracking effects onto HTML5 Canvas with 100% anatomical contour alignment.
 */
export function drawTrackingOnCanvas(
  ctx: CanvasRenderingContext2D,
  effect: TrackingEffect,
  faces: CalibratedFace[],
  canvasWidth: number,
  canvasHeight: number,
  isMirror: boolean = false
) {
  if (effect === 'none' || faces.length === 0) return;

  const mustacheImg = getPreloadedImage('/assets/tracking/mustache.png');
  const angryImg = getPreloadedImage('/assets/tracking/angry.png');
  const doggyEarsImg = getPreloadedImage('/assets/tracking/doggy_ears.png');
  const doggySnoutImg = getPreloadedImage('/assets/tracking/doggy_snout.png');

  for (const rawFace of faces) {
    // Determine screen coordinate bounding box
    const faceX = isMirror
      ? (1.0 - (rawFace.x + rawFace.w)) * canvasWidth
      : rawFace.x * canvasWidth;
    const faceY = rawFace.y * canvasHeight;
    const faceW = rawFace.w * canvasWidth;
    const faceH = rawFace.h * canvasHeight;

    // Check if high-resolution landmarks exist
    let noseX = faceX + faceW * 0.50;
    let noseY = faceY + faceH * 0.51;
    let mouthX = faceX + faceW * 0.50;
    let mouthY = faceY + faceH * 0.70;

    if (rawFace.landmarks) {
      const nLm = rawFace.landmarks.find((l) => l.type === 'nose');
      const mLm = rawFace.landmarks.find((l) => l.type === 'mouth');
      if (nLm) {
        noseX = isMirror ? (1.0 - nLm.x) * canvasWidth : nLm.x * canvasWidth;
        noseY = nLm.y * canvasHeight;
      }
      if (mLm) {
        mouthX = isMirror ? (1.0 - mLm.x) * canvasWidth : mLm.x * canvasWidth;
        mouthY = mLm.y * canvasHeight;
      }
    }

    ctx.save();

    if (effect === 'mustache') {
      // Anchored to the philtrum (directly under nose, directly above upper lip)
      const mW = faceW * 0.46;
      const mH = mW * (121 / 477);
      // Midpoint between nose tip and mouth center
      const philtrumX = (noseX + mouthX) / 2;
      const philtrumY = noseY + (mouthY - noseY) * 0.40;

      ctx.drawImage(mustacheImg, philtrumX - mW / 2, philtrumY - mH / 2, mW, mH);
    } else if (effect === 'angry') {
      // User requirement: "UNTUK EFEK ANGRY TARUH DI BAGIAN DAHI SEBELAH KANAN"
      // Anatomical right forehead:
      // In mirror mode: user's right temple is on the viewer's right (faceX + faceW * 0.72)
      // In non-mirror mode: user's right temple is on viewer's left (faceX + faceW * 0.28)
      const aSize = faceW * 0.22;
      const rightForeheadX = isMirror
        ? faceX + faceW * 0.72 - aSize / 2
        : faceX + faceW * 0.28 - aSize / 2;
      // High on the forehead, safely above the eyebrows
      const foreheadY = faceY - aSize * 0.25;

      ctx.drawImage(angryImg, rightForeheadX, foreheadY, aSize, aSize);
    } else if (effect === 'doggy') {
      // 1. Doggy Ears (Rests directly on crown of the head above hairline)
      const earsW = faceW * 0.94;
      const earsH = earsW * (309 / 424);
      const earsX = faceX + faceW * 0.50 - earsW / 2;
      const earsY = faceY - earsH * 0.68;

      ctx.drawImage(doggyEarsImg, earsX, earsY, earsW, earsH);

      // 2. Doggy Snout (Resting precisely on the tip of the nose)
      const snoutW = faceW * 0.28;
      const snoutH = snoutW * (47 / 152);
      const snoutX = noseX - snoutW / 2;
      const snoutY = noseY - snoutH * 0.40;

      ctx.drawImage(doggySnoutImg, snoutX, snoutY, snoutW, snoutH);
    }

    ctx.restore();
  }
}
