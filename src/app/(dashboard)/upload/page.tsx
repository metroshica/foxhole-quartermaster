"use client";

import { useState, useCallback } from "react";
import { useOCR, OCRItem } from "@/hooks/use-ocr";
import { UploadZone } from "@/components/features/ocr/upload-zone";
import { OCRResultsTable } from "@/components/features/ocr/ocr-results-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, RefreshCw, Save, Clock, Zap, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Upload Page
 *
 * Main OCR upload flow:
 * 1. User uploads a stockpile screenshot
 * 2. Image is preprocessed and OCR'd
 * 3. Results displayed in editable table
 * 4. User reviews/corrects matches
 * 5. (Future) Save to selected stockpile
 *
 * The page provides visual feedback at each stage and handles errors gracefully.
 */

export default function UploadPage() {
  const { toast } = useToast();
  const {
    status,
    progress,
    result,
    error,
    processImage,
    reset,
    updateItem,
  } = useOCR();

  const [items, setItems] = useState<OCRItem[]>([]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      await processImage(file);
    },
    [processImage]
  );

  // Sync items from OCR result
  const displayItems = result?.items || items;

  const handleUpdateItem = useCallback(
    (id: string, updates: Partial<OCRItem>) => {
      updateItem(id, updates);
    },
    [updateItem]
  );

  const handleRemoveItem = useCallback(
    (id: string) => {
      // For now, just filter it out of display
      // In production, this would update the result state
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    []
  );

  const handleSave = useCallback(() => {
    // TODO: Implement save to stockpile
    toast({
      title: "Coming soon!",
      description: "Saving to stockpile will be available in the next update.",
    });
  }, [toast]);

  const isProcessing = status === "loading" || status === "preprocessing" || status === "recognizing" || status === "parsing";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Upload className="h-6 w-6" />
          Upload Screenshot
        </h1>
        <p className="text-muted-foreground">
          Upload a stockpile screenshot to automatically extract inventory data
        </p>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Upload & Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Screenshot</CardTitle>
              <CardDescription>
                Take a screenshot of your stockpile in Foxhole and upload it here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadZone
                onFileSelect={handleFileSelect}
                disabled={isProcessing}
              />
            </CardContent>
          </Card>

          {/* Processing Status */}
          {isProcessing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {status === "loading" && "Loading image..."}
                      {status === "preprocessing" && "Preprocessing image..."}
                      {status === "recognizing" && "Running OCR..."}
                      {status === "parsing" && "Parsing results..."}
                    </span>
                    <span className="text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {status === "error" && error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">OCR Failed</p>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={reset}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processed Image Preview */}
          {result?.processedImageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Processed Image</CardTitle>
                <CardDescription>
                  Preview of the preprocessed image used for OCR
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md overflow-hidden border bg-muted">
                  <img
                    src={result.processedImageUrl}
                    alt="Processed for OCR"
                    className="w-full h-auto max-h-64 object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Results */}
        <div className="space-y-6">
          {result && (
            <>
              {/* Stats Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Processed in{" "}
                        <span className="font-medium">
                          {(result.processingTime / 1000).toFixed(1)}s
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Average confidence:{" "}
                        <Badge
                          variant={
                            result.averageConfidence >= 0.7
                              ? "default"
                              : result.averageConfidence >= 0.5
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {Math.round(result.averageConfidence * 100)}%
                        </Badge>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detected Items</CardTitle>
                  <CardDescription>
                    Review and correct the detected items before saving
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OCRResultsTable
                    items={result.items}
                    onUpdateItem={handleUpdateItem}
                    onRemoveItem={handleRemoveItem}
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleSave} className="flex-1">
                      <Save className="mr-2 h-4 w-4" />
                      Save to Stockpile
                    </Button>
                    <Button variant="outline" onClick={reset}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Upload New
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Raw OCR Output (collapsed) */}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View raw OCR output
                </summary>
                <Card className="mt-2">
                  <CardContent className="pt-4">
                    <pre className="whitespace-pre-wrap text-xs font-mono bg-muted p-3 rounded-md overflow-x-auto">
                      {result.rawText || "(empty)"}
                    </pre>
                  </CardContent>
                </Card>
              </details>
            </>
          )}

          {/* Empty State */}
          {status === "idle" && !result && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Upload a screenshot to see results</p>
                  <p className="text-sm mt-2">
                    Screenshots from Foxhole stockpile views work best
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips for Better Results</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Take screenshots in-game using F12 or your OS screenshot tool</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Make sure the stockpile window is fully visible and not obstructed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Higher resolution screenshots generally produce better results</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Review the detected items and correct any mistakes before saving</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
