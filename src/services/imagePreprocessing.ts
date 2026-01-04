/**
 * Image Preprocessing for SVD Video Generation
 *
 * Optimizes images before SVD generation to improve video quality:
 * - Reduce contrast (fix black crush/white blow)
 * - Normalize colors (accurate reproduction)
 * - Denoise (clean base for motion)
 * - Enhance edges (preserve details)
 */

/**
 * Preprocess image for SVD generation
 * Reduces contrast, normalizes colors, and denoises for better video quality
 *
 * @param base64Image - Input image (base64 data URI)
 * @returns Preprocessed image (base64 data URI)
 */
export async function preprocessImageForSVD(base64Image: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create image element
      const img = new Image();

      img.onload = () => {
        try {
          // Create canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }

          // Draw original image
          ctx.drawImage(img, 0, 0);

          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // 1. Gamma Correction (reduce contrast)
          // γ=1.3 brightens shadows without blowing highlights
          const gamma = 1.3;
          const gammaCorrection = 1 / gamma;

          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.pow(data[i] / 255, gammaCorrection) * 255; // R
            data[i + 1] = Math.pow(data[i + 1] / 255, gammaCorrection) * 255; // G
            data[i + 2] = Math.pow(data[i + 2] / 255, gammaCorrection) * 255; // B
          }

          // 2. Desaturate slightly (-10% saturation)
          // Prevents oversaturated videos
          const saturationFactor = 0.9;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Convert to grayscale
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // Lerp towards grayscale (reduce saturation)
            data[i] = gray + (r - gray) * saturationFactor;
            data[i + 1] = gray + (g - gray) * saturationFactor;
            data[i + 2] = gray + (b - gray) * saturationFactor;
          }

          // 3. Bilateral-like smoothing (denoise while preserving edges)
          // Simple box blur for denoising
          const blurRadius = 1;
          const tempData = new Uint8ClampedArray(data);

          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              let r = 0,
                g = 0,
                b = 0,
                count = 0;

              // Average neighboring pixels
              for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;

                  if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                    const idx = (ny * canvas.width + nx) * 4;
                    r += tempData[idx];
                    g += tempData[idx + 1];
                    b += tempData[idx + 2];
                    count++;
                  }
                }
              }

              const idx = (y * canvas.width + x) * 4;
              data[idx] = r / count;
              data[idx + 1] = g / count;
              data[idx + 2] = b / count;
            }
          }

          // 4. Subtle sharpening (preserve details after blur)
          // Unsharp mask: original + (original - blurred) * amount
          const sharpAmount = 0.3;

          for (let i = 0; i < data.length; i += 4) {
            // Skip sharpening if change is too small (preserve smooth areas)
            const diff = Math.abs(tempData[i] - data[i]);
            if (diff > 5) {
              data[i] = Math.min(255, data[i] + (tempData[i] - data[i]) * sharpAmount);
              data[i + 1] = Math.min(
                255,
                data[i + 1] + (tempData[i + 1] - data[i + 1]) * sharpAmount
              );
              data[i + 2] = Math.min(
                255,
                data[i + 2] + (tempData[i + 2] - data[i + 2]) * sharpAmount
              );
            }
          }

          // Put processed image back
          ctx.putImageData(imageData, 0, 0);

          // Convert to base64
          const processedBase64 = canvas.toDataURL('image/jpeg', 0.95);
          resolve(processedBase64);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for preprocessing'));
      };

      img.src = base64Image;
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Simple preprocessing (fast version)
 * Only applies gamma correction for quick contrast reduction
 */
export async function preprocessImageForSVDFast(base64Image: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');

          if (!ctx) throw new Error('Failed to get canvas context');

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Gamma correction only (fast)
          const gamma = 1.3;
          const gammaCorrection = 1 / gamma;

          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.pow(data[i] / 255, gammaCorrection) * 255;
            data[i + 1] = Math.pow(data[i + 1] / 255, gammaCorrection) * 255;
            data[i + 2] = Math.pow(data[i + 2] / 255, gammaCorrection) * 255;
          }

          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64Image;
    } catch (err) {
      reject(err);
    }
  });
}
