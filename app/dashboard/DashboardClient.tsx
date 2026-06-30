"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  FileText,
  Plus,
  LogOut,
  Trash2,
  Clock,
  Users,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import type { User } from "next-auth";

interface DocMember {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string };
}

interface Document {
  id: string;
  title: string;
  updatedAt: string;
  myRole: string;
  members: DocMember[];
}

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then(setDocs)
      .finally(() => setLoading(false));
  }, []);

  const createDoc = async () => {
    setCreating(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Document" }),
    });
    const doc = await res.json();
    router.push(`/editor/${doc.id}`);
  };

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const roleColor: Record<string, string> = {
    OWNER: "bg-brand-50 text-brand-700 border-brand-200",
    EDITOR: "bg-green-50 text-green-700 border-green-200",
    VIEWER: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <FileText className="text-white" size={15} />
            </div>
            <span className="font-semibold text-gray-900">CollabEdit</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-xs font-semibold">
                {getInitials(user.name)}
              </div>
              <span className="text-sm text-gray-600 hidden sm:block">
                {user.name ?? user.email}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              <LogOut size={15} />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Title row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {docs.length} document{docs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={createDoc}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-60"
          >
            {creating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            New document
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-brand-400" size={28} />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <FileText className="mx-auto text-gray-300 mb-4" size={48} />
            <h2 className="text-lg font-medium text-gray-700">
              No documents yet
            </h2>
            <p className="text-sm text-gray-400 mt-1 mb-6">
              Create your first document to start collaborating
            </p>
            <button
              onClick={createDoc}
              className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition"
            >
              Create document
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/editor/${doc.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-brand-300 hover:shadow-sm transition cursor-pointer group"
              >
                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="text-brand-500" size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900 truncate">
                      {doc.title}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded border font-medium ${roleColor[doc.myRole]}`}
                    >
                      {doc.myRole}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={11} />
                      {formatDate(doc.updatedAt)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Users size={11} />
                      {doc.members.length} member
                      {doc.members.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {doc.myRole === "OWNER" && (
                    <button
                      onClick={(e) => deleteDoc(doc.id, e)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  <ChevronRight
                    className="text-gray-300 group-hover:text-brand-400 transition"
                    size={18}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100 mt-16">
        Built by{" "}
        <a
          href="https://github.com/yourusername"
          target="_blank"
          className="hover:text-brand-500 underline"
        >
          Your Name
        </a>{" "}
        ·{" "}
        <a
          href="https://linkedin.com/in/yourusername"
          target="_blank"
          className="hover:text-brand-500 underline"
        >
          LinkedIn
        </a>{" "}
        ·{" "}
        <a
          href="https://github.com/yourusername/collab-editor"
          target="_blank"
          className="hover:text-brand-500 underline"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
