/**
 * Template Store
 *
 * Manages item icon templates for the stockpile scanner.
 * Templates are stored in IndexedDB for persistence.
 *
 * Users can add templates through "learning mode" where they
 * click on icons in screenshots and label them.
 */

const DB_NAME = "foxhole-quartermaster";
const DB_VERSION = 1;
const STORE_NAME = "icon-templates";

export interface StoredTemplate {
  id: string;
  name: string;
  internalName: string;
  category: string;
  imageDataUrl: string; // Base64 encoded image
  width: number;
  height: number;
  createdAt: number;
}

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("internalName", "internalName", { unique: true });
        store.createIndex("category", "category", { unique: false });
      }
    };
  });
}

/**
 * Save a template to IndexedDB
 */
export async function saveTemplate(template: StoredTemplate): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.put(template);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all templates from IndexedDB
 */
export async function getAllTemplates(): Promise<StoredTemplate[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get a template by internal name
 */
export async function getTemplateByName(
  internalName: string
): Promise<StoredTemplate | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("internalName");

    const request = index.get(internalName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get template count
 */
export async function getTemplateCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.count();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Export all templates as JSON (for backup/sharing)
 */
export async function exportTemplates(): Promise<string> {
  const templates = await getAllTemplates();
  return JSON.stringify(templates, null, 2);
}

/**
 * Import templates from JSON
 */
export async function importTemplates(json: string): Promise<number> {
  const templates: StoredTemplate[] = JSON.parse(json);
  let imported = 0;

  for (const template of templates) {
    try {
      await saveTemplate(template);
      imported++;
    } catch (error) {
      console.error(`Failed to import template ${template.name}:`, error);
    }
  }

  return imported;
}

/**
 * Create a template from a canvas region
 */
export function createTemplateFromCanvas(
  canvas: HTMLCanvasElement,
  name: string,
  category: string
): StoredTemplate {
  const internalName = name.toLowerCase().replace(/\s+/g, "_");

  return {
    id: `${internalName}_${Date.now()}`,
    name,
    internalName,
    category,
    imageDataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
    createdAt: Date.now(),
  };
}

/**
 * Convert stored template to ImageData for OpenCV
 */
export async function templateToImageData(
  template: StoredTemplate
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = template.width;
      canvas.height = template.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, template.width, template.height));
    };
    img.onerror = reject;
    img.src = template.imageDataUrl;
  });
}
