"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, X, Edit2, Search } from "lucide-react";
import type { OCRItem } from "@/hooks/use-ocr";
import { FOXHOLE_ITEMS, searchItems, FoxholeItem } from "@/lib/ocr/item-database";

/**
 * OCR Results Table
 *
 * Displays parsed OCR items in an editable table format.
 * Users can:
 * - Verify/correct item matches
 * - Edit quantities
 * - Remove false positives
 *
 * Color coding:
 * - Green: High confidence match (>80%)
 * - Yellow: Medium confidence (60-80%)
 * - Red: Low confidence or no match (<60%)
 */

interface OCRResultsTableProps {
  items: OCRItem[];
  onUpdateItem: (id: string, updates: Partial<OCRItem>) => void;
  onRemoveItem: (id: string) => void;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.8) {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        {Math.round(confidence * 100)}%
      </Badge>
    );
  }
  if (confidence >= 0.6) {
    return (
      <Badge variant="secondary" className="bg-yellow-600 hover:bg-yellow-700 text-white">
        {Math.round(confidence * 100)}%
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      {confidence > 0 ? `${Math.round(confidence * 100)}%` : "No match"}
    </Badge>
  );
}

function ItemSearchPopover({
  onSelect,
  onClose,
}: {
  onSelect: (item: FoxholeItem) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const results = search ? searchItems(search, 5) : FOXHOLE_ITEMS.slice(0, 5);

  return (
    <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-popover border rounded-md shadow-lg">
      <div className="p-2 border-b">
        <Input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="h-8"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {results.map((item) => (
          <button
            key={item.internalName}
            onClick={() => {
              onSelect(item);
              onClose();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between"
          >
            <span>{item.displayName}</span>
            <Badge variant="outline" className="text-xs">
              {item.category}
            </Badge>
          </button>
        ))}
        {results.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No items found
          </div>
        )}
      </div>
      <div className="p-2 border-t">
        <Button variant="ghost" size="sm" onClick={onClose} className="w-full">
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onUpdate,
  onRemove,
}: {
  item: OCRItem;
  onUpdate: (updates: Partial<OCRItem>) => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [editQuantity, setEditQuantity] = useState(item.quantity.toString());

  const handleQuantitySubmit = () => {
    const quantity = parseInt(editQuantity, 10);
    if (!isNaN(quantity) && quantity >= 0) {
      onUpdate({ quantity });
    } else {
      setEditQuantity(item.quantity.toString());
    }
    setIsEditing(false);
  };

  const handleItemSelect = (selectedItem: FoxholeItem) => {
    onUpdate({
      matchedItem: selectedItem,
      matchConfidence: 1,
    });
  };

  return (
    <TableRow className={cn(item.isEdited && "bg-muted/50")}>
      {/* Status */}
      <TableCell className="w-12">
        {item.matchedItem ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <X className="h-4 w-4 text-destructive" />
        )}
      </TableCell>

      {/* Item Name */}
      <TableCell className="relative">
        <div className="flex items-center gap-2">
          <span className={cn(!item.matchedItem && "text-muted-foreground line-through")}>
            {item.matchedItem?.displayName || item.rawText}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsSearching(true)}
            title="Change item"
          >
            <Search className="h-3 w-3" />
          </Button>
        </div>
        {item.rawText !== item.matchedItem?.displayName && (
          <div className="text-xs text-muted-foreground">
            OCR: {item.rawText}
          </div>
        )}
        {isSearching && (
          <ItemSearchPopover
            onSelect={handleItemSelect}
            onClose={() => setIsSearching(false)}
          />
        )}
      </TableCell>

      {/* Confidence */}
      <TableCell className="w-24">
        <ConfidenceBadge confidence={item.matchConfidence} />
      </TableCell>

      {/* Quantity */}
      <TableCell className="w-32">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              onBlur={handleQuantitySubmit}
              onKeyDown={(e) => e.key === "Enter" && handleQuantitySubmit()}
              className="h-8 w-20"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-mono">{item.quantity.toLocaleString()}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsEditing(true)}
              title="Edit quantity"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-12">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onRemove}
          title="Remove item"
        >
          <X className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function OCRResultsTable({
  items,
  onUpdateItem,
  onRemoveItem,
}: OCRResultsTableProps) {
  const matchedCount = items.filter((i) => i.matchedItem).length;
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Items detected:</span>{" "}
          <span className="font-medium">{items.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Matched:</span>{" "}
          <span className="font-medium text-green-600">{matchedCount}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total quantity:</span>{" "}
          <span className="font-medium">{totalQuantity.toLocaleString()}</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="w-24">Match</TableHead>
              <TableHead className="w-32">Quantity</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No items detected. Try uploading a different screenshot.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onUpdate={(updates) => onUpdateItem(item.id, updates)}
                  onRemove={() => onRemoveItem(item.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
