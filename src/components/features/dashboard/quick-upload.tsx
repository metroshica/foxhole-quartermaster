"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Check, AlertCircle, X } from "lucide-react";
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

export function QuickUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[] | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [stockpiles, setStockpiles] = useState<Stockpile[]>([]);
  const [matchedStockpile, setMatchedStockpile] = useState<Stockpile | null>(null);

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

  // Auto-match stockpile name from scan
  const findMatchingStockpile = useCallback((detectedName: string | undefined): Stockpile | null => {
    if (!detectedName || stockpiles.length === 0) return null;

    const normalized = detectedName.toLowerCase().trim();

    // Exact match first
    const exactMatch = stockpiles.find(
      sp => sp.name.toLowerCase() === normalized
    );
    if (exactMatch) return exactMatch;

    // Partial match
    const partialMatch = stockpiles.find(
      sp => sp.name.toLowerCase().includes(normalized) ||
            normalized.includes(sp.name.toLowerCase())
    );
    return partialMatch || null;
  }, [stockpiles]);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setScanError(null);
    setScanResults(null);
    setMatchedStockpile(null);
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

      if (data.items && data.items.length > 0) {
        // Map scanner results to our format
        const results: ScanResult[] = data.items.map((item: any) => ({
          code: item.item || item.code,
          quantity: item.quantity || 0,
          crated: item.crated || false,
          confidence: item.confidence || 0,
        }));
        setScanResults(results);

        // Try to match stockpile name if returned by scanner
        if (data.stockpileName) {
          const matched = findMatchingStockpile(data.stockpileName);
          if (matched) {
            setMatchedStockpile(matched);
            setSelectedStockpileId(matched.id);
            setSaveMode("update");
          }
        }

        setShowSaveDialog(true);
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

    try {
      if (saveMode === "update" && selectedStockpileId) {
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

        if (!response.ok) throw new Error("Failed to update stockpile");

        router.push(`/stockpiles/${selectedStockpileId}`);
      } else {
        // Create new stockpile
        if (!newStockpileName || !newStockpileHex || !newStockpileLocation) {
          throw new Error("Please fill in all required fields");
        }

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

        const newStockpile = await response.json();
        router.push(`/stockpiles/${newStockpile.id}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      setScanError(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setScanResults(null);
    setScanError(null);
    setMatchedStockpile(null);
    setShowSaveDialog(false);
  };

  const hexNames = getHexNames();
  const locationNames = newStockpileHex ? getLocationsForHex(newStockpileHex) : [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Quick Scan
          </CardTitle>
          <CardDescription>
            Upload a screenshot to scan and update stockpiles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <UploadZone onFileSelect={handleFileSelect} disabled={scanning} />
          ) : scanning ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Scanning image...</p>
            </div>
          ) : scanError ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-destructive">{scanError}</p>
              <Button variant="outline" onClick={handleClear}>
                Try Again
              </Button>
            </div>
          ) : scanResults ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium">
                    {scanResults.length} items detected
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>

              {matchedStockpile && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Matched to: {matchedStockpile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {matchedStockpile.locationName}, {matchedStockpile.hex}
                  </p>
                </div>
              )}

              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {scanResults.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <span className="truncate">{getItemDisplayName(item.code)}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.quantity.toLocaleString()}</span>
                      {item.crated && <Badge variant="secondary" className="text-xs">Crated</Badge>}
                    </div>
                  </div>
                ))}
                {scanResults.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{scanResults.length - 10} more items
                  </p>
                )}
              </div>

              <Button className="w-full" onClick={() => setShowSaveDialog(true)}>
                Save Results
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Scan Results</DialogTitle>
            <DialogDescription>
              {matchedStockpile
                ? `Update "${matchedStockpile.name}" or create a new stockpile`
                : "Choose an existing stockpile to update or create a new one"}
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
