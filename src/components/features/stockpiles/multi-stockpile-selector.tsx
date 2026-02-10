"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, MapPin, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Stockpile {
  id: string;
  name: string;
  hex: string;
  locationName: string;
  type: string;
}

interface MultiStockpileSelectorProps {
  stockpiles: Stockpile[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiStockpileSelector({
  stockpiles,
  selectedIds,
  onSelectionChange,
  placeholder = "Search stockpiles...",
  disabled = false,
}: MultiStockpileSelectorProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get selected stockpiles
  const selectedStockpiles = useMemo(() => {
    return stockpiles.filter((sp) => selectedIds.includes(sp.id));
  }, [stockpiles, selectedIds]);

  // Filter and sort stockpiles
  const filteredStockpiles = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    const filtered = stockpiles.filter((sp) => {
      if (!searchLower) return true;
      return (
        sp.hex.toLowerCase().includes(searchLower) ||
        sp.name.toLowerCase().includes(searchLower) ||
        sp.locationName.toLowerCase().includes(searchLower)
      );
    });

    // Sort by hex, then location
    return filtered.sort((a, b) => {
      const hexCompare = a.hex.localeCompare(b.hex);
      if (hexCompare !== 0) return hexCompare;
      return a.locationName.localeCompare(b.locationName);
    });
  }, [stockpiles, search]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredStockpiles]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && isOpen && filteredStockpiles.length > 0) {
      const highlighted = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlighted) {
        highlighted.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen, filteredStockpiles.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filteredStockpiles.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredStockpiles[highlightedIndex]) {
          handleToggle(filteredStockpiles[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearch("");
        break;
    }
  };

  const handleToggle = (stockpile: Stockpile) => {
    const isSelected = selectedIds.includes(stockpile.id);
    if (isSelected) {
      onSelectionChange(selectedIds.filter((id) => id !== stockpile.id));
    } else {
      onSelectionChange([...selectedIds, stockpile.id]);
    }
  };

  const handleRemove = (stockpileId: string) => {
    onSelectionChange(selectedIds.filter((id) => id !== stockpileId));
  };

  // Format stockpile display: "Hex - Location"
  const formatStockpile = (sp: Stockpile) => `${sp.hex} - ${sp.locationName}`;
  const formatStockpileShort = (sp: Stockpile) => `${sp.hex} - ${sp.locationName} - ${sp.name}`;

  return (
    <div className="space-y-2">
      {/* Selected stockpiles as badges */}
      {selectedStockpiles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedStockpiles.map((sp) => (
            <Badge key={sp.id} variant="secondary" className="gap-1">
              <MapPin className="h-3 w-3" />
              {formatStockpileShort(sp)}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(sp.id)}
                  className="ml-1 hover:bg-muted rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => {
                setIsOpen(false);
                setSearch("");
              }, 150);
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="pl-10"
          />
        </div>

        {isOpen && (
          <div
            ref={listRef}
            className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-popover shadow-lg"
          >
            {filteredStockpiles.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                {search ? `No stockpiles found for "${search}"` : "No stockpiles available"}
              </div>
            ) : (
              filteredStockpiles.map((sp, index) => {
                const isSelected = selectedIds.includes(sp.id);
                return (
                  <div
                    key={sp.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                      index === highlightedIndex && "bg-accent",
                      isSelected && "bg-primary/10"
                    )}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleToggle(sp);
                    }}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{formatStockpile(sp)} - {sp.name}</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
