import { FrameConfig, PlacedSticker, CandidFilter } from '@/types/booth';

export interface RenderCanvasOptions {
  frame: FrameConfig;
  photos: Record<number, string>;
  stickers: PlacedSticker[];
  customBgColor?: string;
  customFooterText?: string;
  filter?: CandidFilter;
  previewWidth?: number; // width of interactive preview stage
}

// Helper to load image async
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

// Apply 1:1 Instagram & TikTok Filter Simulation to Canvas Context
export function applyCandidFilterToContext(
  ctx: CanvasRenderingContext2D,
  filter: CandidFilter
) {
  switch (filter) {
    case 'cpm35': // CPM35 by simxmargo
      ctx.filter = 'contrast(1.15) brightness(1.08) saturate(1.05) sepia(0.08) hue-rotate(-5deg)';
      break;
    case 'blur-gabiiidd': // blur de gabiiidd
      ctx.filter = 'contrast(1.05) brightness(1.12) saturate(1.15) sepia(0.12) hue-rotate(-8deg)';
      break;
    case 'diffusion-ii': // Diffusion II by _johnmarknavarro
      ctx.filter = 'contrast(0.95) brightness(1.15) saturate(0.85) sepia(0.15) hue-rotate(20deg)';
      break;
    case 'light-grunge': // Light grunge by leuvxse
      ctx.filter = 'contrast(1.35) brightness(0.92) saturate(1.18) sepia(0.25) hue-rotate(-12deg)';
      break;
    case 'noir-classic': // Classic Black & White
      ctx.filter = 'grayscale(1) contrast(1.30) brightness(0.96)';
      break;
    case 'warm-candid':
      ctx.filter = 'sepia(0.18) saturate(1.15) contrast(1.08) brightness(1.02)';
      break;
    default:
      ctx.filter = 'none';
      break;
  }
}

/**
 * High-Resolution Offscreen Canvas Compositor
 * Follows exact math and layer pipeline defined in PRD Section 5
 */
export async function renderHighResPhotostrip(
  options: RenderCanvasOptions
): Promise<string> {
  const {
    frame,
    photos,
    stickers,
    customBgColor,
    customFooterText,
    filter = 'warm-candid',
    previewWidth = 400,
  } = options;

  const canvas = document.createElement('canvas');
  const W_export = frame.canvasWidth || 1200;
  const H_export = frame.canvasHeight || 3120;

  canvas.width = W_export;
  canvas.height = H_export;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Unable to create canvas 2D rendering context');
  }

  // LAYER 0: Base Fill
  ctx.fillStyle = customBgColor || frame.backgroundColor || '#160D0C';
  ctx.fillRect(0, 0, W_export, H_export);

  // LAYER 1: User Photos with Object-Fit Cover & Center Crop
  for (const slot of frame.slots) {
    const photoDataUrl = photos[slot.id];
    if (!photoDataUrl) continue;

    try {
      const photoImg = await loadImage(photoDataUrl);

      // Compute destination dimensions
      const Xi = slot.x * W_export;
      const Yi = slot.y * H_export;
      const Wi = slot.w * W_export;
      const Hi = slot.h * H_export;

      // Aspect ratios
      const R_slot = Wi / Hi;
      const W_src = photoImg.naturalWidth || photoImg.width;
      const H_src = photoImg.naturalHeight || photoImg.height;
      const R_src = W_src / H_src;

      let w_crop = 0;
      let h_crop = 0;
      let x_crop = 0;
      let y_crop = 0;

      if (R_src > R_slot) {
        // Source is wider than slot: crop left & right
        w_crop = H_src * R_slot;
        h_crop = H_src;
        x_crop = (W_src - w_crop) / 2;
        y_crop = 0;
      } else {
        // Source is taller than slot: crop top & bottom
        w_crop = W_src;
        h_crop = W_src / R_slot;
        x_crop = 0;
        y_crop = (H_src - h_crop) / 2;
      }

      ctx.save();
      // Apply candid color filter
      applyCandidFilterToContext(ctx, filter);

      // Optional slight bleed padding (4px) to ensure no gaps under frame
      const bleed = 4;
      ctx.drawImage(
        photoImg,
        x_crop,
        y_crop,
        w_crop,
        h_crop,
        Xi - bleed,
        Yi - bleed,
        Wi + bleed * 2,
        Hi + bleed * 2
      );
      ctx.restore();
    } catch (err) {
      console.warn(`Failed to render photo for slot ${slot.id}:`, err);
    }
  }

  // LAYER 2: Transparent Frame Overlay
  if (frame.overlayUrl) {
    try {
      const frameImg = await loadImage(frame.overlayUrl);
      ctx.drawImage(frameImg, 0, 0, W_export, H_export);
    } catch (err) {
      console.warn('Failed to render frame overlay image:', err);
    }
  }

  // LAYER 3: Interactive Stickers
  // Sort stickers by zIndex
  const sortedStickers = [...stickers].sort((a, b) => a.zIndex - b.zIndex);

  for (const stk of sortedStickers) {
    try {
      const stkImg = await loadImage(stk.src);
      const naturalW = stkImg.naturalWidth || stkImg.width;
      const naturalH = stkImg.naturalHeight || stkImg.height;

      // Scale factor relative to target canvas
      const baseStickerWidth = 260; // standard reference width in 1200px canvas
      const targetW = baseStickerWidth * stk.scale;
      const targetH = (naturalH / naturalW) * targetW;

      const posX = stk.x * W_export;
      const posY = stk.y * H_export;

      ctx.save();
      ctx.translate(posX, posY);
      ctx.rotate((stk.rotation * Math.PI) / 180);

      // Render sticker centered at translated anchor
      ctx.drawImage(
        stkImg,
        -targetW / 2,
        -targetH / 2,
        targetW,
        targetH
      );
      ctx.restore();
    } catch (err) {
      console.warn(`Failed to render sticker ${stk.id}:`, err);
    }
  }

  // LAYER 4: Timestamp & Custom Footer Branding
  ctx.save();
  // Vintage analog camera date print: '26 11 02 (Orange/Gold LCD Style)
  const today = new Date();
  const year2Digits = String(today.getFullYear()).slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStamp = `'${year2Digits} ${month} ${day}`;

  // Footer text
  if (customFooterText) {
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#E5B869'; // Marquee gold
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText(customFooterText.toUpperCase(), W_export / 2, H_export - 48);
  }

  // Analog date stamp in bottom right corner
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.fillStyle = '#E0533C'; // Warm analog orange
  ctx.textAlign = 'right';
  ctx.fillText(dateStamp, W_export - 48, H_export - 48);

  ctx.restore();

  // Export as high-res PNG
  return canvas.toDataURL('image/png', 1.0);
}

