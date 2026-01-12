"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { getHexNames } from "@/lib/foxhole/regions";

interface HexSelectorProps {
  value?: string;
  onSelect: (hex: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function HexSelector({
  value,
  onSelect,
  placeholder = "Search hex...",
  disabled = false,
}: HexSelectorProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get all hex names
  const allHexes = useMemo(() => getHexNames(), []);

  // Filter hexes by search
  const filteredHexes = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    if (!searchLower) return allHexes;

    return allHexes.filter((hex) =>
      hex.toLowerCase().includes(searchLower)
    );
  }, [allHexes, search]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredHexes]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && isOpen && filteredHexes.length > 0) {
      const highlighted = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlighted) {
        highlighted.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen, filteredHexes.length]);

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
        setHighlightedIndex((i) => Math.min(i + 1, filteredHexes.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredHexes[highlightedIndex]) {
          handleSelect(filteredHexes[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearch("");
        break;
    }
  };

  const handleSelect = (hex: string) => {
    onSelect(hex);
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect("");
    setSearch("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={isOpen ? search : value || ""}
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
            value && !isOpen && "text-foreground"
          )}
        />
        {value && !isOpen && (
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
          {filteredHexes.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              No hex found for "{search}"
            </div>
          ) : (
            filteredHexes.map((hex, index) => (
              <div
                key={hex}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                  index === highlightedIndex && "bg-accent",
                  hex === value && "bg-primary/10"
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(hex);
                }}
              >
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{hex}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
