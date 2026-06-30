"use client";

import { getDB } from "./db";

const MAX_RETRIES = 3;

export async function flushSyncQueue(documentId: string): Promise<void> {
  const db = getDB();

  const pending = await db.syncQueue
    .where("documentId")
    .equals(documentId)
    .sortBy("timestamp");

  if (pending.length === 0) return;

  console.log(
    `[SyncEngine] Flushing ${pending.length} queued updates for doc ${documentId}`,
  );

  for (const item of pending) {
    if (item.retries >= MAX_RETRIES) {
      console.error(
        `[SyncEngine] Dropping update after ${MAX_RETRIES} retries`,
        item,
      );
      await db.syncQueue.delete(item.id!);
      continue;
    }

    try {
      const resolvedBinary =
        item.update instanceof Uint8Array
          ? item.update
          : new Uint8Array(item.update);

      const safeBufferPart = resolvedBinary.buffer as ArrayBuffer;

      const bodyUpdateStream = new Blob([safeBufferPart], {
        type: "application/octet-stream",
      });

      const res = await fetch(`/api/documents/${documentId}/sync`, {
        method: "POST",
        body: bodyUpdateStream,
        headers: { "Content-Type": "application/octet-stream" },
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      await db.syncQueue.delete(item.id!);
      console.log(`[SyncEngine] Successfully synced update ${item.id}`);
    } catch (err) {
      console.error(`[SyncEngine] Failed to sync update ${item.id}:`, err);
      await db.syncQueue.update(item.id!, { retries: item.retries + 1 });
    }
  }
}

export async function queueUpdate(
  documentId: string,
  update: Uint8Array,
): Promise<void> {
  const db = getDB();
  await db.syncQueue.add({
    documentId,
    update,
    timestamp: new Date(),
    retries: 0,
  });
}

export function setupNetworkListener(documentId: string): () => void {
  const handler = () => {
    if (navigator.onLine) {
      console.log("[SyncEngine] Back online — flushing queue");
      flushSyncQueue(documentId);
    }
  };

  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
