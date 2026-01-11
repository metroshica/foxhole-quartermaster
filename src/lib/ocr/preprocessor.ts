/**
 * Image Preprocessor for OCR
 *
 * Performs canvas-based image preprocessing to improve OCR accuracy.
 * Foxhole stockpile screenshots have specific characteristics:
 * - Dark UI with light text
 * - Item names and quantities in columns
 * - Consistent font and sizing
 *
 * Preprocessing steps:
 * 1. Grayscale conversion (removes color noise)
 * 2. Contrast enhancement (makes text stand out)
 * 3. Binary thresholding (creates crisp black/white image)
 *
 * These operations significantly improve Tesseract accuracy.
 */

/**
 * Load an image file into an HTMLImageElement
 */
export async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert an image to grayscale
 *
 * Uses luminance formula: 0.299*R + 0.587*G + 0.114*B
 * This matches human perception of brightness.
 */
export function grayscale(imageData: ImageData): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Luminance formula
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    data[i] = gray;     // R
    data[i + 1] = gray; // G
    data[i + 2] = gray; // B
    // Alpha unchanged
  }

  return imageData;
}

/**
 * Apply contrast enhancement
 *
 * Uses a simple linear contrast adjustment.
 * Factor > 1 increases contrast, < 1 decreases it.
 */
export function enhanceContrast(imageData: ImageData, factor: number = 1.5): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast to each channel
    data[i] = clamp(factor * (data[i] - 128) + 128);
    data[i + 1] = clamp(factor * (data[i + 1] - 128) + 128);
    data[i + 2] = clamp(factor * (data[i + 2] - 128) + 128);
  }

  return imageData;
}

/**
 * Apply binary thresholding
 *
 * Converts image to pure black and white based on threshold.
 * For Foxhole screenshots (light text on dark), we often invert
 * so text becomes black on white (better for OCR).
 */
export function threshold(
  imageData: ImageData,
  thresholdValue: number = 128,
  invert: boolean = true
): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Use grayscale value (assumes already converted)
    const gray = data[i];

    // Apply threshold
    let value = gray > thresholdValue ? 255 : 0;

    // Invert if needed (dark text on light background is better for OCR)
    if (invert) {
      value = 255 - value;
    }

    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  return imageData;
}

/**
 * Clamp a value to 0-255 range
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Full preprocessing pipeline for Foxhole screenshots
 *
 * Takes an image file and returns a preprocessed canvas ready for OCR.
 * The canvas contains a high-contrast black/white image optimized
 * for text recognition.
 */
export async function preprocessImage(
  file: File,
  options: {
    contrast?: number;
    threshold?: number;
    invert?: boolean;
  } = {}
): Promise<HTMLCanvasElement> {
  const { contrast = 1.5, threshold: thresholdVal = 128, invert = true } = options;

  // Load image
  const img = await loadImage(file);

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Draw image to canvas
  ctx.drawImage(img, 0, 0);

  // Get image data
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Apply preprocessing pipeline
  imageData = grayscale(imageData);
  imageData = enhanceContrast(imageData, contrast);
  imageData = threshold(imageData, thresholdVal, invert);

  // Put processed data back
  ctx.putImageData(imageData, 0, 0);

  // Clean up
  URL.revokeObjectURL(img.src);

  return canvas;
}

/**
 * Get image dimensions without fully loading
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  const { width, height } = img;
  URL.revokeObjectURL(img.src);
  return { width, height };
}
