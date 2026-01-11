"use client";

import { useState, useCallback, useRef } from "react";
import { createWorker, Worker, RecognizeResult } from "tesseract.js";
import { preprocessImage } from "@/lib/ocr/preprocessor";
import { findBestMatch, FoxholeItem } from "@/lib/ocr/item-database";

/**
 * OCR Processing Hook
 *
 * Manages the complete OCR pipeline:
 * 1. Load and preprocess image
 * 2. Run Tesseract.js OCR
 * 3. Parse results to extract item names and quantities
 * 4. Match against known Foxhole items
 *
 * The hook handles worker lifecycle, progress reporting, and error states.
 */

export type OCRStatus = "idle" | "loading" | "preprocessing" | "recognizing" | "parsing" | "done" | "error";

export interface OCRItem {
  id: string;                    // Unique ID for React keys
  rawText: string;               // Original OCR text
  matchedItem: FoxholeItem | null; // Best matching item
  matchConfidence: number;       // Match confidence (0-1)
  quantity: number;              // Parsed quantity
  isEdited: boolean;             // User has edited this row
}

export interface OCRResult {
  items: OCRItem[];
  rawText: string;               // Full raw OCR output
  processedImageUrl: string;     // Data URL of preprocessed image
  processingTime: number;        // Total processing time in ms
  averageConfidence: number;     // Average OCR confidence
}

interface UseOCRReturn {
  status: OCRStatus;
  progress: number;              // 0-100
  result: OCRResult | null;
  error: string | null;
  processImage: (file: File) => Promise<void>;
  reset: () => void;
  updateItem: (id: string, updates: Partial<OCRItem>) => void;
}

/**
 * Parse quantity from OCR text
 *
 * Handles various formats:
 * - "x15" or "x 15" (Foxhole format)
 * - "15" (plain number)
 * - "1.5K" or "1500" (thousands)
 */
function parseQuantity(text: string): number {
  // Remove common OCR artifacts
  const cleaned = text.replace(/[^0-9xXkK.,]/g, "").toLowerCase();

  // Handle "x15" format
  const xMatch = cleaned.match(/x\s*(\d+(?:[.,]\d+)?)\s*(k)?/i);
  if (xMatch) {
    let num = parseFloat(xMatch[1].replace(",", "."));
    if (xMatch[2]) num *= 1000;
    return Math.round(num);
  }

  // Handle plain number with optional K suffix
  const numMatch = cleaned.match(/(\d+(?:[.,]\d+)?)\s*(k)?/i);
  if (numMatch) {
    let num = parseFloat(numMatch[1].replace(",", "."));
    if (numMatch[2]) num *= 1000;
    return Math.round(num);
  }

  return 0;
}

/**
 * Parse OCR output into items with quantities
 *
 * Foxhole stockpile screenshots typically show:
 * - Item icon + name on left
 * - Quantity on right
 *
 * Lines are processed to extract item names and match quantities.
 */
function parseOCROutput(text: string): OCRItem[] {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const items: OCRItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 3) continue; // Skip very short lines

    // Try to find quantity pattern in the line
    const quantityMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(k)?$/i);
    let quantity = 0;
    let itemText = trimmed;

    if (quantityMatch) {
      quantity = parseQuantity(quantityMatch[0]);
      // Remove quantity from item text
      itemText = trimmed.slice(0, -quantityMatch[0].length).trim();
    }

    // Skip lines that are just numbers
    if (!itemText || /^\d+$/.test(itemText)) continue;

    // Skip common OCR garbage
    if (itemText.length < 3 || /^[^a-zA-Z]+$/.test(itemText)) continue;

    // Try to match against known items
    const match = findBestMatch(itemText);

    items.push({
      id: `ocr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      rawText: itemText,
      matchedItem: match?.item || null,
      matchConfidence: match?.confidence || 0,
      quantity,
      isEdited: false,
    });
  }

  return items;
}

export function useOCR(): UseOCRReturn {
  const [status, setStatus] = useState<OCRStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<OCRItem>) => {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? { ...item, ...updates, isEdited: true } : item
        ),
      };
    });
  }, []);

  const processImage = useCallback(async (file: File) => {
    const startTime = Date.now();

    try {
      setStatus("loading");
      setProgress(0);
      setError(null);
      setResult(null);

      // Preprocess the image
      setStatus("preprocessing");
      setProgress(10);

      const canvas = await preprocessImage(file, {
        contrast: 1.5,
        threshold: 128,
        invert: true,
      });

      // Get processed image as data URL
      const processedImageUrl = canvas.toDataURL("image/png");

      setProgress(20);

      // Initialize Tesseract worker
      setStatus("recognizing");

      // Clean up existing worker if any
      if (workerRef.current) {
        await workerRef.current.terminate();
      }

      // Create new worker
      workerRef.current = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            // Map Tesseract progress (0-1) to our range (20-80)
            setProgress(20 + Math.round(m.progress * 60));
          }
        },
      });

      // Run OCR
      const recognizeResult: RecognizeResult = await workerRef.current.recognize(canvas);

      setProgress(80);
      setStatus("parsing");

      // Parse results
      const items = parseOCROutput(recognizeResult.data.text);

      // Calculate average confidence
      const avgConfidence = items.length > 0
        ? items.reduce((sum, item) => sum + item.matchConfidence, 0) / items.length
        : 0;

      setProgress(100);
      setStatus("done");

      setResult({
        items,
        rawText: recognizeResult.data.text,
        processedImageUrl,
        processingTime: Date.now() - startTime,
        averageConfidence: avgConfidence,
      });

      // Clean up worker
      await workerRef.current.terminate();
      workerRef.current = null;

    } catch (err) {
      console.error("OCR error:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "OCR processing failed");

      // Clean up worker on error
      if (workerRef.current) {
        await workerRef.current.terminate();
        workerRef.current = null;
      }
    }
  }, []);

  return {
    status,
    progress,
    result,
    error,
    processImage,
    reset,
    updateItem,
  };
}
