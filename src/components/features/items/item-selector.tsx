"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ITEM_DISPLAY_NAMES, getItemDisplayName } from "@/lib/foxhole/item-names";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";
import { getItemCodesByTag } from "@/lib/foxhole/item-tags";

interface InventoryItem {
  itemCode: string;
  displayName: string;
  totalQuantity: number;
}

interface ItemSelectorProps {
  onSelect: (itemCode: string, displayName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeItems?: string[];
  inventoryItems?: InventoryItem[];
  autoFocus?: boolean;
}

export function ItemSelector({
  onSelect,
  placeholder = "Search items...",
  disabled = false,
  excludeItems = [],
  inventoryItems = [],
  autoFocus = false,
}: ItemSelectorProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build list of all items with inventory info
  const allItems = useMemo(() => {
    const excludeSet = new Set(excludeItems);
    const inventoryMap = new Map(inventoryItems.map(i => [i.itemCode, i.totalQuantity]));

    return Object.entries(ITEM_DISPLAY_NAMES)
      .filter(([code]) => !excludeSet.has(code))
      .map(([code, name]) => ({
        code,
        name,
        inInventory: inventoryMap.has(code),
        quantity: inventoryMap.get(code) || 0,
      }))
      .sort((a, b) => {
        // Sort by: inventory items first (by quantity desc), then alphabetically
        if (a.inInventory && !b.inInventory) return -1;
        if (!a.inInventory && b.inInventory) return 1;
        if (a.inInventory && b.inInventory) return b.quantity - a.quantity;
        return a.name.localeCompare(b.name);
      });
  }, [excludeItems, inventoryItems]);

  // Filter items by search (including tag/abbreviation matching)
  const filteredItems = useMemo(() => {
    if (!search.trim()) {
      // When empty, show inventory items first, limited
      return allItems.slice(0, 30).map(item => ({ ...item, matchedTag: null as string | null }));
    }

    const searchLower = search.toLowerCase().trim();
    const tagMatchedCodes = new Set(getItemCodesByTag(searchLower));

    const matched = allItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.code.toLowerCase().includes(searchLower) ||
          tagMatchedCodes.has(item.code)
      )
      .map(item => ({
        ...item,
        matchedTag: tagMatchedCodes.has(item.code) ? searchLower.toUpperCase() : null as string | null,
      }));

    // Keep inventory-first sorting, limit results
    return matched.slice(0, 30);
  }, [allItems, search]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems]);

  // Track whether highlight change came from keyboard
  const highlightFromKeyboard = useRef(false);

  // Scroll highlighted item into view (only for keyboard navigation)
  useEffect(() => {
    if (listRef.current && isOpen && highlightFromKeyboard.current) {
      const highlighted = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlighted) {
        highlighted.scrollIntoView({ block: "nearest" });
      }
      highlightFromKeyboard.current = false;
    }
  }, [highlightedIndex, isOpen]);

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
        highlightFromKeyboard.current = true;
        setHighlightedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        highlightFromKeyboard.current = true;
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredItems[highlightedIndex]) {
          const item = filteredItems[highlightedIndex];
          onSelect(item.code, item.name);
          setSearch("");
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (item: typeof filteredItems[0]) => {
    onSelect(item.code, item.name);
    setSearch("");
    setIsOpen(false);
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
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay close to allow click to register
            setTimeout(() => setIsOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoFocus={autoFocus}
          className="pl-10"
        />
      </div>

      {isOpen && filteredItems.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-popover shadow-lg"
        >
          {filteredItems.map((item, index) => (
            <div
              key={item.code}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer",
                index === highlightedIndex && "bg-accent",
                item.inInventory && "border-l-2 border-l-green-500"
              )}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur
                handleSelect(item);
              }}
            >
              <img
                src={getItemIconUrl(item.code)}
                alt=""
                className="h-6 w-6 object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="flex-1 truncate">{item.name}</span>
              {item.matchedTag && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {item.matchedTag}
                </span>
              )}
              {item.inInventory && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Package className="h-3 w-3" />
                  {item.quantity.toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {isOpen && search && filteredItems.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-lg">
          No items found
        </div>
      )}
    </div>
  );
}
