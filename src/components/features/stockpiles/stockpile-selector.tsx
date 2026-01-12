"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface Stockpile {
  id: string;
  name: string;
  hex: string;
  locationName: string;
  type: string;
}

interface StockpileSelectorProps {
  stockpiles: Stockpile[];
  value?: string;
  onSelect: (stockpileId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function StockpileSelector({
  stockpiles,
  value,
  onSelect,
  placeholder = "Search by hex...",
  disabled = false,
}: StockpileSelectorProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get currently selected stockpile for display
  const selectedStockpile = useMemo(() => {
    return stockpiles.find((sp) => sp.id === value);
  }, [stockpiles, value]);

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
          handleSelect(filteredStockpiles[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearch("");
        break;
    }
  };

  const handleSelect = (stockpile: Stockpile) => {
    onSelect(stockpile.id);
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect("");
    setSearch("");
    inputRef.current?.focus();
  };

  // Format stockpile display: "Hex - Location - Name"
  const formatStockpile = (sp: Stockpile) => `${sp.hex} - ${sp.locationName} - ${sp.name}`;

  const displayValue = selectedStockpile ? formatStockpile(selectedStockpile) : "";

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={isOpen ? search : displayValue}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearch("");
          }}
          onBlur={() => {
            setTimeout(() => {
              setIsOpen(false);
              setSearch("");
            }, 150);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "pl-10",
            selectedStockpile && !isOpen && "text-foreground"
          )}
        />
        {selectedStockpile && !isOpen && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
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
            filteredStockpiles.map((sp, index) => (
              <div
                key={sp.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                  index === highlightedIndex && "bg-accent",
                  sp.id === value && "bg-primary/10"
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(sp);
                }}
              >
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{formatStockpile(sp)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
