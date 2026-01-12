"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ITEM_DISPLAY_NAMES, getItemDisplayName } from "@/lib/foxhole/item-names";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";

interface ItemSelectorProps {
  value?: string;
  onSelect: (itemCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeItems?: string[];
}

export function ItemSelector({
  value,
  onSelect,
  placeholder = "Select item...",
  disabled = false,
  excludeItems = [],
}: ItemSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Get all items sorted alphabetically by display name
  const items = useMemo(() => {
    const excludeSet = new Set(excludeItems);
    return Object.entries(ITEM_DISPLAY_NAMES)
      .filter(([code]) => !excludeSet.has(code))
      .map(([code, name]) => ({
        code,
        name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [excludeItems]);

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!search) return items.slice(0, 50); // Limit initial display

    const searchLower = search.toLowerCase();
    return items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.code.toLowerCase().includes(searchLower)
      )
      .slice(0, 50);
  }, [items, search]);

  const selectedName = value ? getItemDisplayName(value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedName ? (
            <div className="flex items-center gap-2">
              <img
                src={getItemIconUrl(value!)}
                alt=""
                className="h-5 w-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="truncate">{selectedName}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search items..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.code}
                  value={item.code}
                  onSelect={() => {
                    onSelect(item.code);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <img
                    src={getItemIconUrl(item.code)}
                    alt=""
                    className="mr-2 h-5 w-5 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="truncate">{item.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.code}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
