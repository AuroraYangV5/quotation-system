/**
 * IndexedDB 文件缓存工具
 * 用于存储上传的文件、预览图片和解析结果的关联
 */

const DB_NAME = 'quotation-file-cache';
const DB_VERSION = 1;
const STORE_NAME = 'files';

export interface CachedFileRecord {
  id: string;
  name: string;
  fileBlob: Blob;
  fileType: 'image' | 'excel' | 'pdf';
  timestamp: number;
  parseResult: any | null;
  previewImages: { url: string; sheet_name: string; index: number }[] | null;
}

let db: IDBDatabase | null = null;

export function initFileCache(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve();
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

export function saveFileRecord(record: CachedFileRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export function getFileRecord(id: string): Promise<CachedFileRecord | null> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export function getAllFileRecords(): Promise<CachedFileRecord[]> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const records = request.result || [];
      // 按时间戳倒序排列
      records.sort((a, b) => b.timestamp - a.timestamp);
      resolve(records);
    };
  });
}

export function updateFileRecord(id: string, updates: Partial<CachedFileRecord>): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    try {
      const existing = await getFileRecord(id);
      if (!existing) {
        reject(new Error('Record not found'));
        return;
      }

      const updated = { ...existing, ...updates };
      await saveFileRecord(updated);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function deleteFileRecord(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
