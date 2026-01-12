/**
 * Foxhole Stockpile Scanner
 *
 * Uses OpenCV.js template matching to identify items by their icons,
 * then Tesseract.js to read quantity numbers.
 *
 * This is the correct approach for Foxhole because:
 * - Items are shown as ICONS, not text labels
 * - Only the quantities are text (numbers)
 * - Template matching identifies icons reliably across resolutions
 *
 * References:
 * - foxhole-screenparse: https://github.com/pogobanane/foxhole-screenparse
 * - foxhole-stockpiles: https://github.com/xurxogr/foxhole-stockpiles
 */

import Tesseract from "tesseract.js";

// OpenCV.js types (loaded dynamically)
declare const cv: any;

export interface ScanResult {
  item: string;
  quantity: number;
  crated: number;
  confidence: number;
  position: { x: number; y: number };
}

export interface ScanProgress {
  stage: "loading" | "calibrating" | "scanning" | "reading" | "complete";
  progress: number;
  message: string;
}

export interface IconTemplate {
  name: string;
  internalName: string;
  imageData: ImageData;
  width: number;
  height: number;
}

/**
 * Load OpenCV.js from CDN
 */
export async function loadOpenCV(): Promise<void> {
  if (typeof cv !== "undefined" && cv.Mat) {
    return; // Already loaded
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.9.0/opencv.js";
    script.async = true;

    script.onload = () => {
      // OpenCV.js sets up cv object asynchronously
      const checkReady = () => {
        if (typeof cv !== "undefined" && cv.Mat) {
          resolve();
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    };

    script.onerror = () => reject(new Error("Failed to load OpenCV.js"));
    document.head.appendChild(script);
  });
}

/**
 * StockpileScanner class
 *
 * Handles the full scanning pipeline:
 * 1. Load screenshot into OpenCV
 * 2. Calibrate icon size using known items
 * 3. Template match all item icons
 * 4. OCR read quantity numbers
 */
export class StockpileScanner {
  private templates: Map<string, IconTemplate> = new Map();
  private iconSize: number = 64; // Will be calibrated
  private isReady: boolean = false;

  /**
   * Initialize the scanner
   * Loads OpenCV and icon templates
   */
  async initialize(
    onProgress?: (progress: ScanProgress) => void
  ): Promise<void> {
    onProgress?.({
      stage: "loading",
      progress: 0,
      message: "Loading OpenCV.js...",
    });

    await loadOpenCV();

    onProgress?.({
      stage: "loading",
      progress: 50,
      message: "Loading item templates...",
    });

    await this.loadTemplates();

    onProgress?.({
      stage: "loading",
      progress: 100,
      message: "Scanner ready",
    });

    this.isReady = true;
  }

  /**
   * Load icon templates from the database
   *
   * For MVP, we'll start with a small set of common items.
   * Users can add more through a learning mode.
   */
  private async loadTemplates(): Promise<void> {
    // TODO: Load templates from server or IndexedDB
    // For now, we'll use a placeholder that indicates
    // templates need to be set up

    console.log("Template loading - templates need to be configured");
  }

  /**
   * Add a template from an image file
   */
  async addTemplate(name: string, internalName: string, imageFile: File): Promise<void> {
    const img = await this.loadImage(imageFile);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    this.templates.set(internalName, {
      name,
      internalName,
      imageData,
      width: img.width,
      height: img.height,
    });

    URL.revokeObjectURL(img.src);
  }

  /**
   * Scan a stockpile screenshot
   */
  async scan(
    file: File,
    onProgress?: (progress: ScanProgress) => void
  ): Promise<ScanResult[]> {
    if (!this.isReady) {
      await this.initialize(onProgress);
    }

    const results: ScanResult[] = [];

    onProgress?.({
      stage: "loading",
      progress: 0,
      message: "Loading screenshot...",
    });

    // Load screenshot
    const img = await this.loadImage(file);
    const screenshotMat = this.imageToMat(img);

    // Check if we have templates
    if (this.templates.size === 0) {
      onProgress?.({
        stage: "complete",
        progress: 100,
        message: "No item templates configured. Please set up icon templates first.",
      });

      // Return empty results with a message
      return [];
    }

    onProgress?.({
      stage: "calibrating",
      progress: 10,
      message: "Calibrating icon size...",
    });

    // Calibrate icon size using a reference item
    await this.calibrateIconSize(screenshotMat);

    onProgress?.({
      stage: "scanning",
      progress: 20,
      message: "Scanning for items...",
    });

    // Template match each item
    let scannedCount = 0;
    const totalItems = this.templates.size;

    const templateEntries = Array.from(this.templates.entries());
    for (const [internalName, template] of templateEntries) {
      const matches = this.findTemplate(screenshotMat, template);

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        // Read quantity near this match
        const quantity = await this.readQuantity(
          screenshotMat,
          match.x,
          match.y,
          template.width,
          template.height
        );

        results.push({
          item: template.name,
          quantity: quantity.loose,
          crated: quantity.crated,
          confidence: match.confidence,
          position: { x: match.x, y: match.y },
        });
      }

      scannedCount++;
      onProgress?.({
        stage: "scanning",
        progress: 20 + (scannedCount / totalItems) * 60,
        message: `Scanning: ${template.name}...`,
      });
    }

    // Cleanup
    screenshotMat.delete();
    URL.revokeObjectURL(img.src);

    onProgress?.({
      stage: "complete",
      progress: 100,
      message: `Found ${results.length} items`,
    });

    return results;
  }

  /**
   * Load image into HTMLImageElement
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Convert image to OpenCV Mat
   */
  private imageToMat(img: HTMLImageElement): any {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(img, 0, 0);
    return cv.imread(canvas);
  }

  /**
   * Calibrate icon size based on screenshot resolution
   *
   * Foxhole has consistent icon sizes relative to resolution.
   * Common sizes:
   * - 1920x1080: ~64px icons
   * - 2560x1440: ~85px icons
   * - 3840x2160: ~128px icons
   */
  private async calibrateIconSize(screenshotMat: any): Promise<void> {
    const width = screenshotMat.cols;

    // Estimate based on resolution
    if (width >= 3840) {
      this.iconSize = 128;
    } else if (width >= 2560) {
      this.iconSize = 85;
    } else {
      this.iconSize = 64;
    }

    // TODO: Fine-tune by actually finding a reference icon
  }

  /**
   * Find template in screenshot using OpenCV matchTemplate
   */
  private findTemplate(
    screenshotMat: any,
    template: IconTemplate
  ): Array<{ x: number; y: number; confidence: number }> {
    const matches: Array<{ x: number; y: number; confidence: number }> = [];

    try {
      // Create template Mat from ImageData
      const templateCanvas = document.createElement("canvas");
      templateCanvas.width = template.width;
      templateCanvas.height = template.height;
      const ctx = templateCanvas.getContext("2d");
      if (!ctx) return matches;

      ctx.putImageData(template.imageData, 0, 0);
      const templateMat = cv.imread(templateCanvas);

      // Resize template to calibrated icon size
      const scaledTemplate = new cv.Mat();
      const scale = this.iconSize / template.width;
      cv.resize(
        templateMat,
        scaledTemplate,
        new cv.Size(
          Math.round(template.width * scale),
          Math.round(template.height * scale)
        )
      );

      // Convert both to grayscale for matching
      const grayScreenshot = new cv.Mat();
      const grayTemplate = new cv.Mat();
      cv.cvtColor(screenshotMat, grayScreenshot, cv.COLOR_RGBA2GRAY);
      cv.cvtColor(scaledTemplate, grayTemplate, cv.COLOR_RGBA2GRAY);

      // Template matching
      const result = new cv.Mat();
      cv.matchTemplate(
        grayScreenshot,
        grayTemplate,
        result,
        cv.TM_CCOEFF_NORMED
      );

      // Find all matches above threshold
      const threshold = 0.8;
      const minDist = this.iconSize; // Minimum distance between matches

      // Get all local maxima above threshold
      const foundPositions: Array<{ x: number; y: number; confidence: number }> = [];

      for (let y = 0; y < result.rows; y++) {
        for (let x = 0; x < result.cols; x++) {
          const confidence = result.floatAt(y, x);
          if (confidence >= threshold) {
            // Check if too close to existing match
            const tooClose = foundPositions.some(
              (p) => Math.abs(p.x - x) < minDist && Math.abs(p.y - y) < minDist
            );

            if (!tooClose) {
              foundPositions.push({ x, y, confidence });
            } else {
              // Update if higher confidence
              const existing = foundPositions.find(
                (p) => Math.abs(p.x - x) < minDist && Math.abs(p.y - y) < minDist
              );
              if (existing && confidence > existing.confidence) {
                existing.x = x;
                existing.y = y;
                existing.confidence = confidence;
              }
            }
          }
        }
      }

      matches.push(...foundPositions);

      // Cleanup
      templateMat.delete();
      scaledTemplate.delete();
      grayScreenshot.delete();
      grayTemplate.delete();
      result.delete();
    } catch (error) {
      console.error("Template matching error:", error);
    }

    return matches;
  }

  /**
   * Read quantity number near an item icon
   *
   * In Foxhole stockpiles, quantities appear below or to the right of icons.
   */
  private async readQuantity(
    screenshotMat: any,
    x: number,
    y: number,
    iconWidth: number,
    iconHeight: number
  ): Promise<{ loose: number; crated: number }> {
    try {
      // Extract region below the icon where quantity typically appears
      const regionX = x;
      const regionY = y + iconHeight;
      const regionWidth = iconWidth * 2;
      const regionHeight = Math.round(iconHeight * 0.5);

      // Bounds check
      if (
        regionX < 0 ||
        regionY < 0 ||
        regionX + regionWidth > screenshotMat.cols ||
        regionY + regionHeight > screenshotMat.rows
      ) {
        return { loose: 0, crated: 0 };
      }

      // Extract ROI
      const roi = screenshotMat.roi(
        new cv.Rect(regionX, regionY, regionWidth, regionHeight)
      );

      // Convert to canvas for Tesseract
      const canvas = document.createElement("canvas");
      canvas.width = regionWidth;
      canvas.height = regionHeight;
      cv.imshow(canvas, roi);

      // OCR the region
      // Note: tessedit_char_whitelist is a valid Tesseract option but not typed in WorkerOptions
      const result = await Tesseract.recognize(canvas, "eng", {
        tessedit_char_whitelist: "0123456789",
      } as any);

      roi.delete();

      // Parse the text to extract numbers
      const text = result.data.text.trim();
      const numbers = text.match(/\d+/g);

      if (numbers && numbers.length > 0) {
        // First number is usually the quantity
        return {
          loose: parseInt(numbers[0], 10),
          crated: numbers.length > 1 ? parseInt(numbers[1], 10) : 0,
        };
      }

      return { loose: 0, crated: 0 };
    } catch (error) {
      console.error("Quantity OCR error:", error);
      return { loose: 0, crated: 0 };
    }
  }

  /**
   * Get list of loaded templates
   */
  getTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Check if scanner has templates loaded
   */
  hasTemplates(): boolean {
    return this.templates.size > 0;
  }
}

// Singleton instance
let scannerInstance: StockpileScanner | null = null;

export function getScanner(): StockpileScanner {
  if (!scannerInstance) {
    scannerInstance = new StockpileScanner();
  }
  return scannerInstance;
}
