"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Loader2, Trash2, Crown, Pencil, Eye } from "lucide-react";

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
}

interface Props {
  documentId: string;
  onClose: () => void;
}

const ROLE_ICONS = { OWNER: Crown, EDITOR: Pencil, VIEWER: Eye };
const ROLE_COLORS: Record<string, string> = {
  OWNER: "text-brand-600 bg-brand-50",
  EDITOR: "text-green-600 bg-green-50",
  VIEWER: "text-gray-500 bg-gray-50",
};

export default function InviteModal({ documentId, onClose }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/documents/${documentId}/invite`)
      .then((r) => r.json())
      .then(setMembers)
      .finally(() => setLoading(false));
  }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError("");

    const res = await fetch(`/api/documents/${documentId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to invite user");
    } else {
      setMembers((prev) => [...prev, data]);
      setEmail("");
    }
    setInviting(false);
  };

  const getInitials = (name: string | null, email: string) =>
    (name ?? email).slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UserPlus size={17} className="text-brand-500" />
            <h2 className="font-semibold text-gray-900">Share document</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* Invite form */}
          <form onSubmit={invite} className="flex gap-2 mb-5">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="Email address"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-60 transition"
            >
              {inviting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                "Invite"
              )}
            </button>
          </form>

          {error && <p className="text-xs text-red-600 -mt-3 mb-3">{error}</p>}

          {/* Members list */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Members ({members.length})
            </p>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-gray-300" size={20} />
              </div>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => {
                  const Icon =
                    ROLE_ICONS[m.role as keyof typeof ROLE_ICONS] ?? Eye;
                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50"
                    >
                      <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-xs font-semibold flex-shrink-0">
                        {getInitials(m.user.name, m.user.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {m.user.name ?? m.user.email}
                        </p>
                        {m.user.name && (
                          <p className="text-xs text-gray-400 truncate">
                            {m.user.email}
                          </p>
                        )}
                      </div>
                      <span
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role]}`}
                      >
                        <Icon size={11} />
                        {m.role}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
