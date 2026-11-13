// ============================================================
// 📱 Motor de Almacenamiento Local Offline (IndexedDB)
// Soporta modo Standalone / Desconectado sin límite de 5 MB.
// Permite guardar cientos de anotaciones y fotos de prendas
// directamente en la memoria del celular o dispositivo.
// ============================================================

const DB_NAME = "coretextil_offline_db";
const DB_VERSION = 1;
const STORE_LOGS = "manual_logs";
const STORE_PHOTOS = "photo_cache";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB no disponible en este entorno"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        db.createObjectStore(STORE_LOGS, { keyPath: "storageKey" });
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLogsOffline(storageKey: string, logs: any[]): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LOGS, "readwrite");
      const store = tx.objectStore(STORE_LOGS);
      const req = store.put({ storageKey, logs, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("OfflineStorage: Error guardando en IndexedDB:", err);
    return false;
  }
}

export async function loadLogsOffline(storageKey: string): Promise<any[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LOGS, "readonly");
      const store = tx.objectStore(STORE_LOGS);
      const req = store.get(storageKey);
      req.onsuccess = () => {
        resolve(req.result ? req.result.logs : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("OfflineStorage: Error cargando de IndexedDB:", err);
    return null;
  }
}

export async function savePhotoOffline(photoId: string, base64OrBlob: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PHOTOS, "readwrite");
      const store = tx.objectStore(STORE_PHOTOS);
      const req = store.put({ id: photoId, data: base64OrBlob, savedAt: new Date().toISOString() });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return false;
  }
}

export async function getPhotoOffline(photoId: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PHOTOS, "readonly");
      const store = tx.objectStore(STORE_PHOTOS);
      const req = store.get(photoId);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
