/**
 * In Frame In-Browser Canvas Background Remover
 * Automatically detects and cleanly punches out white, green, or solid backgrounds
 * from user-uploaded images, generating a transparent PNG sticker with zero external latency.
 */

export async function removeBackgroundInBrowser(
  file: File | Blob
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 800; // Optimal performance for stickers
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;

          // Sample 4 corners to detect background color
          const cornerIndices = [
            0, // top-left
            (w - 1) * 4, // top-right
            ((h - 1) * w) * 4, // bottom-left
            ((h - 1) * w + (w - 1)) * 4, // bottom-right
          ];

          let avgR = 0, avgG = 0, avgB = 0;
          for (const idx of cornerIndices) {
            avgR += data[idx];
            avgG += data[idx + 1];
            avgB += data[idx + 2];
          }
          avgR /= 4;
          avgG /= 4;
          avgB /= 4;

          // Flood-fill / connected component mask from borders:
          // A pixel is background if it is within color threshold of corner color
          const isBg = new Uint8Array(w * h);
          const visited = new Uint8Array(w * h);
          const threshold = 38;

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const i = (y * w + x) * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              // Color distance from detected corner background
              const dist = Math.sqrt(
                (r - avgR) ** 2 + (g - avgG) ** 2 + (b - avgB) ** 2
              );

              // Also check near-white threshold
              const isWhite = r > 235 && g > 235 && b > 235;

              if (dist < threshold || isWhite) {
                isBg[y * w + x] = 1;
              }
            }
          }

          // Flood-fill BFS queue starting from perimeter
          const queue: number[] = [];
          for (let x = 0; x < w; x++) {
            if (isBg[x]) {
              visited[x] = 1;
              queue.push(x);
            }
            const bottomIdx = (h - 1) * w + x;
            if (isBg[bottomIdx]) {
              visited[bottomIdx] = 1;
              queue.push(bottomIdx);
            }
          }

          for (let y = 0; y < h; y++) {
            const leftIdx = y * w;
            if (isBg[leftIdx] && !visited[leftIdx]) {
              visited[leftIdx] = 1;
              queue.push(leftIdx);
            }
            const rightIdx = y * w + (w - 1);
            if (isBg[rightIdx] && !visited[rightIdx]) {
              visited[rightIdx] = 1;
              queue.push(rightIdx);
            }
          }

          // BFS to only remove background connected to outer edges
          let head = 0;
          while (head < queue.length) {
            const curr = queue[head++];
            const cx = curr % w;
            const cy = Math.floor(curr / w);

            const neighbors = [
              cy > 0 ? (cy - 1) * w + cx : -1,
              cy < h - 1 ? (cy + 1) * w + cx : -1,
              cx > 0 ? cy * w + (cx - 1) : -1,
              cx < w - 1 ? cy * w + (cx + 1) : -1,
            ];

            for (const n of neighbors) {
              if (n !== -1 && isBg[n] && !visited[n]) {
                visited[n] = 1;
                queue.push(n);
              }
            }
          }

          // Set all visited outer background pixels to transparent
          for (let i = 0; i < w * h; i++) {
            if (visited[i]) {
              data[i * 4 + 3] = 0; // alpha = 0
            }
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          // If any error occurs, return original as fallback
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

