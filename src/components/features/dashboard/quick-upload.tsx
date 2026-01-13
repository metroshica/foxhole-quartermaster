"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, Loader2, Check, AlertCircle, X, RefreshCw, Plus, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadZone } from "@/components/features/ocr/upload-zone";
import { getHexNames, getLocationsForHex } from "@/lib/foxhole/regions";
import { getItemDisplayName } from "@/lib/foxhole/item-names";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";

interface ScanResult {
  code: string;
  quantity: number;
  crated: boolean;
  confidence: number;
}

interface Stockpile {
  id: string;
  name: string;
  hex: string;
  locationName: string;
  type: string;
}

interface QuickUploadProps {
  onSaveSuccess?: () => void;
  compact?: boolean;
}

export function QuickUpload({ onSaveSuccess, compact = false }: QuickUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[] | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [stockpiles, setStockpiles] = useState<Stockpile[]>([]);
  const [matchedStockpile, setMatchedStockpile] = useState<Stockpile | null>(null);
  const [detectedStockpileName, setDetectedStockpileName] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveMode, setSaveMode] = useState<"new" | "update">("update");
  const [selectedStockpileId, setSelectedStockpileId] = useState<string>("");
  const [newStockpileName, setNewStockpileName] = useState("");
  const [newStockpileHex, setNewStockpileHex] = useState("");
  const [newStockpileLocation, setNewStockpileLocation] = useState("");
  const [newStockpileType, setNewStockpileType] = useState<"STORAGE_DEPOT" | "SEAPORT">("STORAGE_DEPOT");
  const [saving, setSaving] = useState(false);

  // Fetch stockpiles for matching and dropdown
  useEffect(() => {
    async function fetchStockpiles() {
      try {
        const response = await fetch("/api/stockpiles");
        if (response.ok) {
          const data = await response.json();
          setStockpiles(data);
        }
      } catch (error) {
        console.error("Error fetching stockpiles:", error);
      }
    }
    fetchStockpiles();
  }, []);

  // Normalize string for matching (remove special chars, lowercase, handle 0/O confusion)
  const normalizeForMatch = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .replace(/o/g, "0")  // Normalize O to 0 for OCR confusion
      .replace(/l/g, "1"); // Normalize l to 1 for OCR confusion
  };

  // Auto-match stockpile name from scan
  const findMatchingStockpile = useCallback((detectedName: string | undefined): Stockpile | null => {
    if (!detectedName || stockpiles.length === 0) return null;

    const normalizedDetected = normalizeForMatch(detectedName);
    const detectedLower = detectedName.toLowerCase().trim();

    console.log("[QuickUpload] Matching stockpile:", {
      detected: detectedName,
      normalizedDetected,
      availableStockpiles: stockpiles.map(s => ({ name: s.name, normalized: normalizeForMatch(s.name) }))
    });

    // Exact match first (case insensitive)
    const exactMatch = stockpiles.find(
      sp => sp.name.toLowerCase() === detectedLower
    );
    if (exactMatch) {
      console.log("[QuickUpload] Exact match found:", exactMatch.name);
      return exactMatch;
    }

    // Normalized match (ignore special characters like dashes)
    const normalizedMatch = stockpiles.find(
      sp => normalizeForMatch(sp.name) === normalizedDetected
    );
    if (normalizedMatch) {
      console.log("[QuickUpload] Normalized match found:", normalizedMatch.name);
      return normalizedMatch;
    }

    // Partial/contains match
    const partialMatch = stockpiles.find(
      sp => {
        const spNorm = normalizeForMatch(sp.name);
        return spNorm.includes(normalizedDetected) || normalizedDetected.includes(spNorm);
      }
    );
    if (partialMatch) {
      console.log("[QuickUpload] Partial match found:", partialMatch.name);
    }
    return partialMatch || null;
  }, [stockpiles]);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    // Create preview URL for thumbnail
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setScanError(null);
    setScanResults(null);
    setMatchedStockpile(null);
    setDetectedStockpileName(null);
    setScanning(true);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("faction", "all");

      const response = await fetch("/api/scanner", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Scanner failed");
      }

      const data = await response.json();
      console.log("[QuickUpload] Scanner response:", data);

      if (data.items && data.items.length > 0) {
        // Map scanner results to our format
        const results: ScanResult[] = data.items.map((item: any) => ({
          code: item.item || item.code,
          quantity: item.quantity || 0,
          crated: item.crated || false,
          confidence: item.confidence || 0,
        }));
        setScanResults(results);

        // Store detected stockpile name for display (scanner returns "name" field)
        const detectedName = data.name || data.stockpileName;
        if (detectedName) {
          setDetectedStockpileName(detectedName);
          // Try to match stockpile name
          const matched = findMatchingStockpile(detectedName);
          if (matched) {
            setMatchedStockpile(matched);
            setSelectedStockpileId(matched.id);
            setSaveMode("update");
          }
        }
        // Don't auto-open dialog - let user review scanned items first
      } else {
        setScanError("No items detected in the screenshot");
      }
    } catch (error) {
      console.error("Scan error:", error);
      setScanError("Failed to scan image. Make sure the scanner service is running.");
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!scanResults) return;

    setSaving(true);
    let savedStockpileName = "";

    try {
      if (saveMode === "update" && selectedStockpileId) {
        // Get stockpile name for success message
        const stockpile = stockpiles.find(s => s.id === selectedStockpileId);
        savedStockpileName = stockpile?.name || "stockpile";

        // Update existing stockpile
        const response = await fetch(`/api/stockpiles/${selectedStockpileId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: scanResults.map(r => ({
              code: r.code,
              quantity: r.quantity,
              crated: r.crated,
              confidence: r.confidence,
            })),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || errorData.error || "Failed to update stockpile");
        }
      } else {
        // Create new stockpile
        if (!newStockpileName || !newStockpileHex || !newStockpileLocation) {
          throw new Error("Please fill in all required fields");
        }

        savedStockpileName = newStockpileName;

        const response = await fetch("/api/stockpiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newStockpileName,
            hex: newStockpileHex,
            locationName: newStockpileLocation,
            type: newStockpileType,
            items: scanResults.map(r => ({
              code: r.code,
              quantity: r.quantity,
              crated: r.crated,
              confidence: r.confidence,
            })),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create stockpile");
        }
      }

      // Success - show message briefly, then clear for next upload
      const itemCount = scanResults.length;
      setSuccessMessage(`Saved ${itemCount} items to "${savedStockpileName}"`);

      // Clear the form for next upload
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setFile(null);
      setPreviewUrl(null);
      setScanResults(null);
      setMatchedStockpile(null);
      setDetectedStockpileName(null);
      setShowSaveDialog(false);
      setSelectedStockpileId("");
      setNewStockpileName("");
      setNewStockpileHex("");
      setNewStockpileLocation("");

      // Notify parent to refresh data
      onSaveSuccess?.();

      // Clear success message after a delay
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Save error:", error);
      setScanError(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setScanResults(null);
    setScanError(null);
    setMatchedStockpile(null);
    setDetectedStockpileName(null);
    setShowSaveDialog(false);
  };

  const hexNames = getHexNames();
  const locationNames = newStockpileHex ? getLocationsForHex(newStockpileHex) : [];

  return (
    <>
      <Card>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Quick Scan
          </CardTitle>
          <CardDescription>
            Paste a screenshot with Ctrl+V
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Success message */}
          {successMessage && (
            <div className="mb-4 p-2 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                {successMessage}
              </p>
            </div>
          )}

          {!file ? (
            <UploadZone onFileSelect={handleFileSelect} disabled={scanning} compact={compact} />
          ) : scanning ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Scanning...</p>
            </div>
          ) : scanError ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-destructive">{scanError}</p>
              <Button variant="outline" size="sm" onClick={handleClear}>
                Try Again
              </Button>
            </div>
          ) : scanResults ? (
            <div className="space-y-3">
              {/* Header with Summary and Thumbnail */}
              <div className="flex items-start gap-3 border-b pb-3">
                {/* Thumbnail Preview */}
                {previewUrl && (
                  <div className="shrink-0">
                    <img
                      src={previewUrl}
                      alt="Screenshot"
                      className="w-24 h-16 object-cover rounded border"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="text-lg font-bold">
                      {scanResults.length} Items
                    </span>
                  </div>
                  {detectedStockpileName && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {detectedStockpileName}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={handleClear} className="shrink-0 h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Scanned Items Grid - Compact */}
              <div className="border rounded-lg p-2 bg-muted/30">
                <div className={compact ? "max-h-[200px] overflow-y-auto" : "max-h-[300px] overflow-y-auto"}>
                  <div className="grid grid-cols-2 gap-1">
                    {scanResults.slice(0, compact ? 10 : scanResults.length).map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 p-1.5 rounded bg-background border text-xs"
                      >
                        <div className="h-6 w-6 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          <img
                            src={getItemIconUrl(item.code)}
                            alt=""
                            className="h-5 w-5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                        <span className="flex-1 truncate font-medium">{getItemDisplayName(item.code)}</span>
                        <span className="font-bold shrink-0">{item.quantity.toLocaleString()}</span>
                        {item.crated && <Badge variant="secondary" className="text-[10px] px-1 h-4">C</Badge>}
                      </div>
                    ))}
                  </div>
                  {compact && scanResults.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      +{scanResults.length - 10} more items
                    </p>
                  )}
                </div>
              </div>

              {/* Matched Stockpile Confirmation */}
              {matchedStockpile ? (
                <div className="p-4 bg-green-500/10 border-2 border-green-500/30 rounded-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400">
                        Match Found
                      </p>
                      <p className="text-base font-bold truncate">
                        {matchedStockpile.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {matchedStockpile.locationName}, {matchedStockpile.hex}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Update
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setMatchedStockpile(null);
                          setSelectedStockpileId("");
                          setShowSaveDialog(true);
                        }}
                      >
                        Other
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* No Match - Show Save Options */
                <div className="p-4 border-2 border-dashed rounded-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {detectedStockpileName
                          ? `No match for "${detectedStockpileName}"`
                          : "No stockpile detected"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Choose where to save
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSaveMode("update");
                          setShowSaveDialog(true);
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Update
                      </Button>
                      <Button
                        onClick={() => {
                          setSaveMode("new");
                          setShowSaveDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {saveMode === "new" ? "Create New Stockpile" : "Select Stockpile"}
            </DialogTitle>
            <DialogDescription>
              {saveMode === "new"
                ? "Enter details for the new stockpile"
                : "Choose which stockpile to update with the scanned items"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={saveMode === "update" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setSaveMode("update")}
              >
                Update Existing
              </Button>
              <Button
                variant={saveMode === "new" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setSaveMode("new")}
              >
                Create New
              </Button>
            </div>

            {saveMode === "update" ? (
              <div className="space-y-2">
                <Label>Select Stockpile</Label>
                <Select value={selectedStockpileId} onValueChange={setSelectedStockpileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a stockpile..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stockpiles.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name} ({sp.locationName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g., Main Storage"
                    value={newStockpileName}
                    onChange={(e) => setNewStockpileName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hex</Label>
                    <Select value={newStockpileHex} onValueChange={(v) => {
                      setNewStockpileHex(v);
                      setNewStockpileLocation("");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select hex..." />
                      </SelectTrigger>
                      <SelectContent>
                        {hexNames.map((hex) => (
                          <SelectItem key={hex} value={hex}>{hex}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select value={newStockpileLocation} onValueChange={setNewStockpileLocation} disabled={!newStockpileHex}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location..." />
                      </SelectTrigger>
                      <SelectContent>
                        {locationNames.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newStockpileType} onValueChange={(v) => setNewStockpileType(v as typeof newStockpileType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STORAGE_DEPOT">Storage Depot</SelectItem>
                      <SelectItem value="SEAPORT">Seaport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || (saveMode === "update" && !selectedStockpileId)}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {saveMode === "update" ? "Update Stockpile" : "Create Stockpile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
