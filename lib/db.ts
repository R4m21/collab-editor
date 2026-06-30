import Dexie, { type Table } from "dexie";

export interface LocalDocument {
  id: string;
  title: string;
  ydocState?: Uint8Array;
  syncedAt?: Date;
  updatedAt: Date;
}

export interface SyncQueueItem {
  id?: number;
  documentId: string;
  update: Uint8Array;
  timestamp: Date;
  retries: number;
}

export class AppDB extends Dexie {
  documents!: Table<LocalDocument>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super("collab-editor-v1");
    this.version(1).stores({
      documents: "id, syncedAt, updatedAt",
      syncQueue: "++id, documentId, timestamp",
    });
  }
}

// Safe singleton — only created in browser, never on server
let _db: AppDB | null = null;

export function getDB(): AppDB {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!_db) _db = new AppDB();
  return _db;
}
