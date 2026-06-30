"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { HocuspocusProvider } from "@hocuspocus/provider";
import type { User } from "next-auth";
import { getColorForUser } from "@/lib/utils";
import { setupNetworkListener, queueUpdate } from "@/lib/sync-engine";
import EditorToolbar from "@/components/editor/EditorToolbar";
import VersionHistory from "@/components/editor/VersionHistory";
import InviteModal from "@/components/editor/InviteModal";
import AIPanel from "@/components/editor/AIPanel";
import ConnectionStatus from "@/components/editor/ConnectionStatus";
import { ArrowLeft, History, Users, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface EditorClientProps {
  documentId: string;
  user: User;
}

export default function EditorClient({ documentId, user }: EditorClientProps) {
  const router = useRouter();

  // ── 1. Create Yjs doc ONCE at module level (outside effects) ──────────────
  // useMemo runs synchronously on first render — before useEditor — so
  // ydoc is never null when TipTap's Collaboration extension reads it.
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

  const providerRef = useRef<HocuspocusProvider | null>(null);

  const [docTitle, setDocTitle] = useState("Untitled Document");
  const [myRole, setMyRole] = useState<"OWNER" | "EDITOR" | "VIEWER">("VIEWER");
  const [isOnline, setIsOnline] = useState(true);
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [showVersions, setShowVersions] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const titleSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userColor = useMemo(
    () => getColorForUser(user.id ?? user.email ?? ""),
    [user],
  );
  const userName = user.name ?? user.email ?? "Anonymous";

  // ── 2. WebSocket provider ─────────────────────────────────────────────────
  // Also created synchronously so CollaborationCursor has a real provider.
  const provider = useMemo(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:1234";

    const p = new HocuspocusProvider({
      url: wsUrl,
      name: documentId,
      document: ydoc,
      connect: false,
    });
    providerRef.current = p;
    return p;
  }, [documentId, ydoc]);

  // ── 3. TipTap editor ──────────────────────────────────────────────────────
  const editor = useEditor({
    immediatelyRender: false, // ← fixes SSR hydration warning
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCaret.configure({
        provider,
        user: { name: userName, color: userColor },
      }),
      Placeholder.configure({ placeholder: "Start writing your document…" }),
      CharacterCount,
    ],
    editable: false, // set properly once role loads
    onUpdate: ({ editor }) => {
      setWordCount(editor.storage.characterCount?.words() ?? 0);
    },
  });

  // ── 4. Side effects: IndexedDB, WS connect, metadata fetch ───────────────
  useEffect(() => {
    // IndexedDB persistence — works fully offline
    const persistence = new IndexeddbPersistence(documentId, ydoc);
    persistence.on("synced", () => {
      console.log("[Editor] Loaded from IndexedDB");
    });

    // Set awareness then connect
    provider.awareness.setLocalState({
      user: { name: userName, color: userColor, email: user.email },
    });
    provider.connect();

    provider.on("status", ({ status }) => {
      setWsStatus(status as "connecting" | "connected" | "disconnected");
    });

    // Queue REST updates when WS is down
    const handleYjsUpdate = (update: Uint8Array) => {
      if (!navigator.onLine || provider.status !== "connected") {
        queueUpdate(documentId, update);
      }
    };
    ydoc.on("update", handleYjsUpdate);

    // Network listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    const cleanupSync = setupNetworkListener(documentId);

    // Fetch document metadata + server state
    fetch(`/api/documents/${documentId}`)
      .then((r) => r.json())
      .then((doc) => {
        if (doc.title) setDocTitle(doc.title);
        if (doc.myRole) setMyRole(doc.myRole);

        // Pull server Yjs state if available (initial load / new device)
        if (doc.content) {
          fetch(`/api/documents/${documentId}/sync`)
            .then((r) => (r.status === 200 ? r.arrayBuffer() : null))
            .then((buf) => {
              if (buf && buf.byteLength > 0) {
                Y.applyUpdate(ydoc, new Uint8Array(buf));
              }
            })
            .catch(console.error);
        }
      })
      .catch(console.error);

    return () => {
      cleanupSync();
      ydoc.off("update", handleYjsUpdate);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      provider.disconnect();
      provider.destroy();
      persistence.destroy();
      ydoc.destroy();
    };
  }, [documentId, ydoc, provider, userName, userColor, user.email]);

  // ── 5. Sync editable state once role is known ─────────────────────────────
  useEffect(() => {
    if (editor) editor.setEditable(myRole !== "VIEWER");
  }, [editor, myRole]);

  // ── 6. Title autosave ─────────────────────────────────────────────────────
  const saveTitle = useCallback(
    async (title: string) => {
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    },
    [documentId],
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDocTitle(val);
    clearTimeout(titleSaveTimeout.current ?? undefined);
    titleSaveTimeout.current = setTimeout(() => saveTitle(val), 1000);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 px-4 h-12 border-b border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={() => router.push("/dashboard")}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={18} />
        </button>

        <input
          value={docTitle}
          onChange={handleTitleChange}
          disabled={myRole === "VIEWER"}
          className="flex-1 font-medium text-gray-900 text-sm bg-transparent outline-none border-none truncate disabled:cursor-default placeholder:text-gray-400"
          placeholder="Untitled Document"
          maxLength={255}
        />

        <div className="flex items-center gap-2 ml-auto">
          <ConnectionStatus isOnline={isOnline} wsStatus={wsStatus} />

          {myRole !== "VIEWER" && (
            <button
              onClick={() => setShowAI(!showAI)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition"
            >
              <Sparkles size={13} />
              AI
            </button>
          )}

          <button
            onClick={() => setShowVersions(!showVersions)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <History size={13} />
            History
          </button>

          {myRole === "OWNER" && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg transition"
            >
              <Users size={13} />
              Share
            </button>
          )}

          {myRole === "VIEWER" && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-lg">
              View only
            </span>
          )}
        </div>
      </header>

      {/* ── Toolbar ── */}
      {editor && myRole !== "VIEWER" && <EditorToolbar editor={editor} />}

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto min-h-full">
            <EditorContent editor={editor} className="min-h-full" />
          </div>
        </div>

        {showVersions && (
          <VersionHistory
            documentId={documentId}
            ydoc={ydoc}
            myRole={myRole}
            onClose={() => setShowVersions(false)}
          />
        )}

        {showAI && editor && (
          <AIPanel editor={editor} onClose={() => setShowAI(false)} />
        )}
      </div>

      {/* ── Status bar ── */}
      <footer className="h-7 flex items-center gap-4 px-6 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex-shrink-0">
        <span>{wordCount} words</span>
        {!isOnline && (
          <span className="text-amber-600 font-medium">
            ● Offline — changes saved locally
          </span>
        )}
        <span className="ml-auto capitalize">{myRole.toLowerCase()}</span>
      </footer>

      {showInvite && (
        <InviteModal
          documentId={documentId}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
