"use client";

import { useState, useEffect } from "react";
import { X, Plus, Clock, RotateCcw, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import * as Y from "yjs";

interface Version {
  id: string;
  label: string;
  createdBy: string;
  createdAt: string;
}

interface Props {
  documentId: string;
  ydoc: Y.Doc;
  myRole: string;
  onClose: () => void;
}

export default function VersionHistory({
  documentId,
  ydoc,
  myRole,
  onClose,
}: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    setLoading(true);
    const res = await fetch(`/api/documents/${documentId}/versions`);
    const data = await res.json();
    setVersions(data);
    setLoading(false);
  };

  const saveVersion = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    await fetch(`/api/documents/${documentId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim() }),
    });
    setNewLabel("");
    setShowCreate(false);
    await loadVersions();
    setSaving(false);
  };

  const restoreVersion = async (versionId: string) => {
    if (!confirm("Restore this version? Current state will be replaced."))
      return;
    setRestoring(versionId);

    try {
      // Fetch snapshot bytes
      const res = await fetch(
        `/api/documents/${documentId}/versions/${versionId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch version");
      const buf = await res.arrayBuffer();

      // Apply to Yjs doc (this syncs to all connected clients)
      Y.applyUpdate(ydoc, new Uint8Array(buf));

      // Also save to server
      await fetch(`/api/documents/${documentId}/versions/${versionId}`, {
        method: "POST",
      });
    } catch (err) {
      alert("Failed to restore version. Please try again.");
      console.error(err);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <aside className="w-72 border-l border-gray-200 bg-white flex flex-col flex-shrink-0 animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-800">
            Version history
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <X size={16} />
        </button>
      </div>

      {myRole !== "VIEWER" && (
        <div className="p-3 border-b border-gray-100">
          {showCreate ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveVersion()}
                placeholder="Version name…"
                className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button
                onClick={saveVersion}
                disabled={saving || !newLabel.trim()}
                className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded-lg hover:bg-brand-600 disabled:opacity-50 transition"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  "Save"
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition"
            >
              <Plus size={14} />
              Save current version
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-gray-300" size={22} />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Clock className="mx-auto text-gray-200 mb-2" size={32} />
            <p className="text-xs text-gray-400">No versions saved yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {versions.map((v) => (
              <li
                key={v.id}
                className="px-4 py-3 hover:bg-gray-50 transition group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {v.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {v.createdBy} · {formatDate(v.createdAt)}
                    </p>
                  </div>
                  {myRole !== "VIEWER" && (
                    <button
                      onClick={() => restoreVersion(v.id)}
                      disabled={!!restoring}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg opacity-0 group-hover:opacity-100 transition disabled:opacity-50 flex-shrink-0"
                      title="Restore this version"
                    >
                      {restoring === v.id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <RotateCcw size={11} />
                      )}
                      Restore
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
