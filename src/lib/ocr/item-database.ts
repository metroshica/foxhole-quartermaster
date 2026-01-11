/**
 * Foxhole Item Database
 *
 * Contains known items for matching OCR results against.
 * Items are organized by category for easier management.
 *
 * The matching process uses fuzzy string matching to handle
 * OCR errors (e.g., "Rifle Crafe" should match "Rifle Crate").
 *
 * This is a simplified subset - a full implementation would
 * fetch items from the database and include all game items.
 */

export interface FoxholeItem {
  internalName: string;  // Lowercase, normalized for matching
  displayName: string;   // Human-readable display name
  category: string;
  aliases?: string[];    // Alternative names/abbreviations
}

/**
 * Sample Foxhole items for OCR matching
 *
 * In production, this would be fetched from the database.
 * Items are seeded via prisma/seed.ts
 */
export const FOXHOLE_ITEMS: FoxholeItem[] = [
  // Small Arms
  { internalName: "rifle", displayName: "Rifle", category: "SMALL_ARMS", aliases: ["rifles"] },
  { internalName: "rifle crate", displayName: "Rifle Crate", category: "SMALL_ARMS" },
  { internalName: "carbine", displayName: "Carbine", category: "SMALL_ARMS" },
  { internalName: "carbine crate", displayName: "Carbine Crate", category: "SMALL_ARMS" },
  { internalName: "smg", displayName: "SMG", category: "SMALL_ARMS", aliases: ["submachine gun"] },
  { internalName: "smg crate", displayName: "SMG Crate", category: "SMALL_ARMS" },
  { internalName: "pistol", displayName: "Pistol", category: "SMALL_ARMS" },
  { internalName: "pistol crate", displayName: "Pistol Crate", category: "SMALL_ARMS" },
  { internalName: "sniper rifle", displayName: "Sniper Rifle", category: "SMALL_ARMS" },
  { internalName: "sniper rifle crate", displayName: "Sniper Rifle Crate", category: "SMALL_ARMS" },

  // Heavy Arms
  { internalName: "machine gun", displayName: "Machine Gun", category: "HEAVY_ARMS", aliases: ["mg", "hmg"] },
  { internalName: "machine gun crate", displayName: "Machine Gun Crate", category: "HEAVY_ARMS" },
  { internalName: "mortar", displayName: "Mortar", category: "HEAVY_ARMS" },
  { internalName: "mortar crate", displayName: "Mortar Crate", category: "HEAVY_ARMS" },
  { internalName: "anti-tank rifle", displayName: "Anti-Tank Rifle", category: "HEAVY_ARMS", aliases: ["atr", "at rifle"] },
  { internalName: "anti-tank rifle crate", displayName: "Anti-Tank Rifle Crate", category: "HEAVY_ARMS" },
  { internalName: "rpg", displayName: "RPG", category: "HEAVY_ARMS", aliases: ["rocket launcher"] },
  { internalName: "rpg crate", displayName: "RPG Crate", category: "HEAVY_ARMS" },
  { internalName: "flamethrower", displayName: "Flamethrower", category: "HEAVY_ARMS" },
  { internalName: "flamethrower crate", displayName: "Flamethrower Crate", category: "HEAVY_ARMS" },

  // Ammunition
  { internalName: "7.62mm", displayName: "7.62mm", category: "AMMUNITION" },
  { internalName: "7.62mm crate", displayName: "7.62mm Crate", category: "AMMUNITION" },
  { internalName: "7.92mm", displayName: "7.92mm", category: "AMMUNITION" },
  { internalName: "7.92mm crate", displayName: "7.92mm Crate", category: "AMMUNITION" },
  { internalName: "9mm", displayName: "9mm", category: "AMMUNITION" },
  { internalName: "9mm crate", displayName: "9mm Crate", category: "AMMUNITION" },
  { internalName: "12.7mm", displayName: "12.7mm", category: "AMMUNITION" },
  { internalName: "12.7mm crate", displayName: "12.7mm Crate", category: "AMMUNITION" },
  { internalName: "mortar shell", displayName: "Mortar Shell", category: "AMMUNITION" },
  { internalName: "mortar shell crate", displayName: "Mortar Shell Crate", category: "AMMUNITION" },
  { internalName: "40mm", displayName: "40mm", category: "AMMUNITION" },
  { internalName: "40mm crate", displayName: "40mm Crate", category: "AMMUNITION" },
  { internalName: "68mm", displayName: "68mm", category: "AMMUNITION" },
  { internalName: "68mm crate", displayName: "68mm Crate", category: "AMMUNITION" },
  { internalName: "rpg shell", displayName: "RPG Shell", category: "AMMUNITION" },
  { internalName: "rpg shell crate", displayName: "RPG Shell Crate", category: "AMMUNITION" },

  // Utility
  { internalName: "binoculars", displayName: "Binoculars", category: "UTILITY" },
  { internalName: "binoculars crate", displayName: "Binoculars Crate", category: "UTILITY" },
  { internalName: "radio", displayName: "Radio", category: "UTILITY" },
  { internalName: "radio crate", displayName: "Radio Crate", category: "UTILITY" },
  { internalName: "wrench", displayName: "Wrench", category: "UTILITY" },
  { internalName: "wrench crate", displayName: "Wrench Crate", category: "UTILITY" },
  { internalName: "hammer", displayName: "Hammer", category: "UTILITY" },
  { internalName: "hammer crate", displayName: "Hammer Crate", category: "UTILITY" },
  { internalName: "shovel", displayName: "Shovel", category: "UTILITY" },
  { internalName: "shovel crate", displayName: "Shovel Crate", category: "UTILITY" },

  // Medical
  { internalName: "bandages", displayName: "Bandages", category: "MEDICAL" },
  { internalName: "bandages crate", displayName: "Bandages Crate", category: "MEDICAL" },
  { internalName: "first aid kit", displayName: "First Aid Kit", category: "MEDICAL", aliases: ["fak"] },
  { internalName: "first aid kit crate", displayName: "First Aid Kit Crate", category: "MEDICAL" },
  { internalName: "trauma kit", displayName: "Trauma Kit", category: "MEDICAL" },
  { internalName: "trauma kit crate", displayName: "Trauma Kit Crate", category: "MEDICAL" },
  { internalName: "blood plasma", displayName: "Blood Plasma", category: "MEDICAL" },
  { internalName: "blood plasma crate", displayName: "Blood Plasma Crate", category: "MEDICAL" },

  // Resources
  { internalName: "basic materials", displayName: "Basic Materials", category: "RESOURCES", aliases: ["bmats"] },
  { internalName: "basic materials crate", displayName: "Basic Materials Crate", category: "RESOURCES" },
  { internalName: "refined materials", displayName: "Refined Materials", category: "RESOURCES", aliases: ["rmats"] },
  { internalName: "refined materials crate", displayName: "Refined Materials Crate", category: "RESOURCES" },
  { internalName: "explosive materials", displayName: "Explosive Materials", category: "RESOURCES", aliases: ["emats"] },
  { internalName: "explosive materials crate", displayName: "Explosive Materials Crate", category: "RESOURCES" },
  { internalName: "heavy explosive materials", displayName: "Heavy Explosive Materials", category: "RESOURCES", aliases: ["hemats"] },
  { internalName: "heavy explosive materials crate", displayName: "Heavy Explosive Materials Crate", category: "RESOURCES" },
  { internalName: "diesel", displayName: "Diesel", category: "RESOURCES" },
  { internalName: "diesel crate", displayName: "Diesel Crate", category: "RESOURCES" },
  { internalName: "petrol", displayName: "Petrol", category: "RESOURCES" },
  { internalName: "petrol crate", displayName: "Petrol Crate", category: "RESOURCES" },

  // Supplies
  { internalName: "soldier supplies", displayName: "Soldier Supplies", category: "SUPPLIES", aliases: ["ss", "ssupplies"] },
  { internalName: "soldier supplies crate", displayName: "Soldier Supplies Crate", category: "SUPPLIES" },
  { internalName: "garrison supplies", displayName: "Garrison Supplies", category: "SUPPLIES", aliases: ["gsupplies"] },
  { internalName: "garrison supplies crate", displayName: "Garrison Supplies Crate", category: "SUPPLIES" },

  // Grenades & Explosives
  { internalName: "frag grenade", displayName: "Frag Grenade", category: "SMALL_ARMS" },
  { internalName: "frag grenade crate", displayName: "Frag Grenade Crate", category: "SMALL_ARMS" },
  { internalName: "smoke grenade", displayName: "Smoke Grenade", category: "SMALL_ARMS" },
  { internalName: "smoke grenade crate", displayName: "Smoke Grenade Crate", category: "SMALL_ARMS" },
  { internalName: "he grenade", displayName: "HE Grenade", category: "SMALL_ARMS" },
  { internalName: "he grenade crate", displayName: "HE Grenade Crate", category: "SMALL_ARMS" },

  // Gas
  { internalName: "gas mask", displayName: "Gas Mask", category: "UTILITY" },
  { internalName: "gas mask crate", displayName: "Gas Mask Crate", category: "UTILITY" },
  { internalName: "gas mask filter", displayName: "Gas Mask Filter", category: "UTILITY" },
  { internalName: "gas mask filter crate", displayName: "Gas Mask Filter Crate", category: "UTILITY" },
];

/**
 * Calculate Levenshtein distance between two strings
 *
 * Used for fuzzy matching OCR results to known items.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1) between two strings
 *
 * 1.0 = exact match, 0.0 = completely different
 */
export function similarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

/**
 * Find the best matching item for an OCR string
 *
 * Returns the item with the highest similarity score,
 * along with the confidence level.
 */
export function findBestMatch(
  ocrText: string,
  minConfidence: number = 0.6
): { item: FoxholeItem; confidence: number } | null {
  const normalized = ocrText.toLowerCase().trim();

  let bestMatch: FoxholeItem | null = null;
  let bestScore = 0;

  for (const item of FOXHOLE_ITEMS) {
    // Check main name
    const nameScore = similarity(normalized, item.internalName);
    if (nameScore > bestScore) {
      bestScore = nameScore;
      bestMatch = item;
    }

    // Check aliases
    if (item.aliases) {
      for (const alias of item.aliases) {
        const aliasScore = similarity(normalized, alias.toLowerCase());
        if (aliasScore > bestScore) {
          bestScore = aliasScore;
          bestMatch = item;
        }
      }
    }
  }

  if (bestMatch && bestScore >= minConfidence) {
    return { item: bestMatch, confidence: bestScore };
  }

  return null;
}

/**
 * Get all items in a category
 */
export function getItemsByCategory(category: string): FoxholeItem[] {
  return FOXHOLE_ITEMS.filter((item) => item.category === category);
}

/**
 * Search items by name (for autocomplete)
 */
export function searchItems(query: string, limit: number = 10): FoxholeItem[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];

  return FOXHOLE_ITEMS.filter(
    (item) =>
      item.internalName.includes(normalized) ||
      item.displayName.toLowerCase().includes(normalized) ||
      item.aliases?.some((a) => a.toLowerCase().includes(normalized))
  ).slice(0, limit);
}
