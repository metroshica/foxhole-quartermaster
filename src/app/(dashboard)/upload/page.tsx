"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Upload,
  RefreshCw,
  Scan,
  Package,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UploadZone } from "@/components/features/ocr/upload-zone";
import { getItemDisplayName } from "@/lib/foxhole/item-names";
import { getHexNames, getLocationsForHex } from "@/lib/foxhole/regions";

/**
 * Upload Page
 *
 * Scan Foxhole stockpile screenshots using the foxhole-stockpiles service.
 * This uses a production-proven scanner with 99.99% accuracy.
 */

interface ScanResult {
  code: string;
  quantity: number;
  crated: boolean;
  confidence: number;
  candidates?: Array<{ code: string; confidence: number }>;
}

interface StockpileData {
  name: string;
  type: string;
  items: ScanResult[];
  timestamp: string;
  resolution: string;
  errors: string[];
}

type ScannerStatus = "checking" | "available" | "unavailable";

interface ExistingStockpile {
  id: string;
  name: string;
  hex: string;
  locationName: string;
  type: string;
}

export default function UploadPage() {
  const { toast } = useToast();

  // Scanner status
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("checking");

  // Screenshot state
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState("");
  const [scanResults, setScanResults] = useState<StockpileData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Options
  const [faction, setFaction] = useState<string>("all");

  // Existing stockpiles for update mode
  const [existingStockpiles, setExistingStockpiles] = useState<ExistingStockpile[]>([]);
  const [selectedStockpileId, setSelectedStockpileId] = useState<string>("");

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveMode, setSaveMode] = useState<"new" | "update">("new");
  const [stockpileName, setStockpileName] = useState("");
  const [stockpileType, setStockpileType] = useState<string>("STORAGE_DEPOT");
  const [stockpileHex, setStockpileHex] = useState("");
  const [stockpileLocation, setStockpileLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Get available locations based on selected hex
  const availableLocations = stockpileHex ? getLocationsForHex(stockpileHex) : [];
  const hexNames = getHexNames();

  // Check scanner status and fetch stockpiles on mount
  useEffect(() => {
    checkScannerStatus();
    fetchExistingStockpiles();
  }, []);

  async function fetchExistingStockpiles() {
    try {
      const response = await fetch("/api/stockpiles");
      if (response.ok) {
        const data = await response.json();
        setExistingStockpiles(data);
      }
    } catch {
      // Silently fail - stockpiles list is optional
    }
  }

  async function checkScannerStatus() {
    setScannerStatus("checking");
    try {
      const response = await fetch("/api/scanner");
      if (response.ok) {
        setScannerStatus("available");
      } else {
        setScannerStatus("unavailable");
      }
    } catch {
      setScannerStatus("unavailable");
    }
  }

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setScreenshotFile(file);
    setScanResults(null);
    setScanError(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setScreenshotPreview(url);
  }, []);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [screenshotPreview]);

  // Global paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleFileSelect(file);
          }
          return;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleFileSelect]);

  // Scan screenshot
  const handleScan = useCallback(async () => {
    if (!screenshotFile) return;

    setIsScanning(true);
    setScanProgress(10);
    setScanMessage("Uploading screenshot...");
    setScanError(null);
    setScanResults(null);

    try {
      const formData = new FormData();
      formData.append("image", screenshotFile);
      if (faction !== "all") {
        formData.append("faction", faction);
      }

      setScanProgress(30);
      setScanMessage("Scanning for items...");

      const response = await fetch("/api/scanner", {
        method: "POST",
        body: formData,
      });

      setScanProgress(80);
      setScanMessage("Processing results...");

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || "Scan failed");
      }

      const result: StockpileData = await response.json();
      setScanProgress(100);
      setScanResults(result);
      setScanMessage(`Found ${result.items.length} items`);

      toast({
        title: "Scan complete",
        description: `Found ${result.items.length} items in ${result.type || "stockpile"}`,
      });
    } catch (error) {
      console.error("Scan error:", error);
      const message = error instanceof Error ? error.message : "Scan failed";
      setScanError(message);
      setScanMessage("");
      toast({
        title: "Scan failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }, [screenshotFile, faction, toast]);

  // Clear current scan
  const handleClear = useCallback(() => {
    setScreenshotFile(null);
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshotPreview(null);
    setScanResults(null);
    setScanError(null);
    setScanMessage("");
    setScanProgress(0);
  }, [screenshotPreview]);

  // Open save dialog with auto-populated name
  const handleOpenSaveDialog = useCallback(() => {
    if (scanResults) {
      // Use detected stockpile name or generate a default
      const defaultName = scanResults.name || `Stockpile ${new Date().toLocaleDateString()}`;
      setStockpileName(defaultName);

      // Map detected type to our enum (only STORAGE_DEPOT or SEAPORT)
      const typeMap: Record<string, string> = {
        "Storage Depot": "STORAGE_DEPOT",
        "Seaport": "SEAPORT",
      };
      setStockpileType(typeMap[scanResults.type] || "STORAGE_DEPOT");
      setStockpileHex("");
      setStockpileLocation("");
      setSaveMode("new");
      setSelectedStockpileId("");
      setShowSaveDialog(true);
    }
  }, [scanResults]);

  // Handle hex change - reset location when hex changes
  const handleHexChange = useCallback((hex: string) => {
    setStockpileHex(hex);
    setStockpileLocation(""); // Reset location when hex changes
  }, []);

  // Handle selecting an existing stockpile to update
  const handleSelectExistingStockpile = useCallback((stockpileId: string) => {
    setSelectedStockpileId(stockpileId);
    if (stockpileId) {
      const stockpile = existingStockpiles.find((s) => s.id === stockpileId);
      if (stockpile) {
        setStockpileName(stockpile.name);
        setStockpileHex(stockpile.hex);
        setStockpileLocation(stockpile.locationName);
        setStockpileType(stockpile.type);
      }
    }
  }, [existingStockpiles]);

  // Save stockpile to database (create or update)
  const handleSaveStockpile = useCallback(async () => {
    if (!scanResults) return;

    // For update mode, we only need the stockpile ID
    if (saveMode === "update" && !selectedStockpileId) return;

    // For new mode, we need all fields
    if (saveMode === "new" && (!stockpileName.trim() || !stockpileHex || !stockpileLocation)) return;

    setIsSaving(true);
    try {
      const items = scanResults.items.map((item) => ({
        code: item.code,
        quantity: item.quantity,
        crated: item.crated,
        confidence: item.confidence,
      }));

      let response: Response;
      let successMessage: string;

      if (saveMode === "update" && selectedStockpileId) {
        // Update existing stockpile
        response = await fetch(`/api/stockpiles/${selectedStockpileId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        successMessage = "Stockpile updated";
      } else {
        // Create new stockpile
        response = await fetch("/api/stockpiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: stockpileName.trim(),
            type: stockpileType,
            hex: stockpileHex,
            locationName: stockpileLocation,
            items,
          }),
        });
        successMessage = "Stockpile saved";
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save stockpile");
      }

      const saved = await response.json();
      toast({
        title: successMessage,
        description: `"${saved.name}" now has ${scanResults.items.length} items`,
      });
      setShowSaveDialog(false);

      // Refresh stockpiles list and clear
      fetchExistingStockpiles();
      handleClear();
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save stockpile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [scanResults, saveMode, selectedStockpileId, stockpileName, stockpileType, stockpileHex, stockpileLocation, toast, handleClear]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Upload className="h-6 w-6" />
          Stockpile Scanner
        </h1>
        <p className="text-muted-foreground">
          Scan stockpile screenshots to extract item quantities
        </p>
      </div>

      {/* Scanner Status */}
      {scannerStatus === "unavailable" && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium">Scanner service unavailable</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The scanner Docker container is not running. Start it with:
                </p>
                <code className="text-sm bg-muted px-2 py-1 rounded mt-2 block">
                  docker compose up scanner -d
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={checkScannerStatus}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {scannerStatus === "checking" && (
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Checking scanner service...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Screenshot</CardTitle>
            <CardDescription>
              Press Ctrl+V to paste, or drag & drop a file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!screenshotPreview ? (
              <UploadZone
                onFileSelect={handleFileSelect}
                disabled={isScanning || scannerStatus !== "available"}
              />
            ) : (
              <div className="space-y-4">
                <div className="relative border rounded-lg overflow-hidden bg-muted">
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    disabled={isScanning}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                  <Select value={faction} onValueChange={setFaction}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Faction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="colonials">Colonials</SelectItem>
                      <SelectItem value="wardens">Wardens</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Scan Results</CardTitle>
            <CardDescription>
              {scanResults
                ? `${scanResults.items.length} items detected`
                : "Upload a screenshot to scan"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Scanning Progress */}
            {isScanning && (
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span>{scanMessage}</span>
                  <span>{scanProgress}%</span>
                </div>
                <Progress value={scanProgress} />
              </div>
            )}

            {/* Error State */}
            {scanError && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive mb-4">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium">Scan failed</p>
                  <p className="text-sm mt-1">{scanError}</p>
                </div>
              </div>
            )}

            {/* Results List */}
            {scanResults && scanResults.items.length > 0 && (
              <div className="space-y-2">
                {scanResults.name && (
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">{scanResults.name}</span>
                    {scanResults.type && (
                      <Badge variant="outline">{scanResults.type}</Badge>
                    )}
                  </div>
                )}
                <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                  {scanResults.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{getItemDisplayName(item.code)}</p>
                        {item.crated && (
                          <span className="text-xs text-muted-foreground">Crated</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{item.quantity.toLocaleString()}</span>
                        </div>
                        <Badge
                          variant={item.confidence > 0.9 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {Math.round(item.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {scanResults && scanResults.items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items detected</p>
                <p className="text-sm mt-2">
                  Make sure the screenshot shows a stockpile or seaport inventory
                </p>
              </div>
            )}

            {/* No Results Yet */}
            {!scanResults && !isScanning && !scanError && (
              <div className="text-center py-8 text-muted-foreground">
                <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Paste a screenshot to scan</p>
              </div>
            )}

            {/* Action Buttons */}
            {screenshotFile && (
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleScan}
                  disabled={isScanning || scannerStatus !== "available"}
                  className="flex-1"
                  variant={scanResults ? "outline" : "default"}
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Scan className="h-4 w-4 mr-2" />
                      {scanResults ? "Scan Again" : "Scan Screenshot"}
                    </>
                  )}
                </Button>
                {scanResults && scanResults.items.length > 0 && (
                  <Button onClick={handleOpenSaveDialog} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save Stockpile
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About the Scanner</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <div className="font-medium mb-1">99.99% Accuracy</div>
              <p className="text-muted-foreground">
                Uses production-proven template matching with pre-built icons for all Foxhole items.
              </p>
            </div>
            <div>
              <div className="font-medium mb-1">Fast Processing</div>
              <p className="text-muted-foreground">
                Scans complete in 1-2 seconds using optimized image recognition.
              </p>
            </div>
            <div>
              <div className="font-medium mb-1">Powered by foxhole-stockpiles</div>
              <p className="text-muted-foreground">
                Open-source scanner by xurxogr with support for all stockpile types.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Stockpile Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Stockpile</DialogTitle>
            <DialogDescription>
              Create a new stockpile or update an existing one.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={saveMode} onValueChange={(v) => setSaveMode(v as "new" | "update")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">New Stockpile</TabsTrigger>
              <TabsTrigger value="update" disabled={existingStockpiles.length === 0}>
                Update Existing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="stockpile-name">Stockpile Name</Label>
                <Input
                  id="stockpile-name"
                  value={stockpileName}
                  onChange={(e) => setStockpileName(e.target.value)}
                  placeholder="e.g., Main Storage"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hex</Label>
                  <Select value={stockpileHex} onValueChange={handleHexChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hex..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {hexNames.map((hex) => (
                        <SelectItem key={hex} value={hex}>
                          {hex}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select
                    value={stockpileLocation}
                    onValueChange={setStockpileLocation}
                    disabled={!stockpileHex}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={stockpileHex ? "Select location..." : "Select hex first"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {availableLocations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={stockpileType} onValueChange={setStockpileType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STORAGE_DEPOT">Storage Depot</SelectItem>
                    <SelectItem value="SEAPORT">Seaport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="update" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Stockpile to Update</Label>
                <Select value={selectedStockpileId} onValueChange={handleSelectExistingStockpile}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stockpile..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {existingStockpiles.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name} ({sp.locationName}, {sp.hex})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedStockpileId && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="text-muted-foreground">
                    This will replace all items in the selected stockpile with the new scan results.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {scanResults && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">
                {scanResults.items.length} items will be saved
              </p>
              <p className="text-muted-foreground mt-1">
                Total quantity:{" "}
                {scanResults.items
                  .reduce((sum, item) => sum + item.quantity, 0)
                  .toLocaleString()}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveStockpile}
              disabled={
                isSaving ||
                (saveMode === "new" && (!stockpileName.trim() || !stockpileHex || !stockpileLocation)) ||
                (saveMode === "update" && !selectedStockpileId)
              }
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {saveMode === "update" ? "Updating..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMode === "update" ? "Update Stockpile" : "Save Stockpile"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
