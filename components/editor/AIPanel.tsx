"use client";

import { useState } from "react";
import {
  X,
  Sparkles,
  Loader2,
  Copy,
  Check,
  FileText,
  Wand2,
  AlignLeft,
  MessageSquare,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor;
  onClose: () => void;
}

type Action = "summarize" | "grammar" | "expand" | "tone";

const ACTIONS = [
  {
    id: "summarize" as Action,
    label: "Summarize",
    icon: AlignLeft,
    desc: "Get key points",
  },
  {
    id: "grammar" as Action,
    label: "Fix grammar",
    icon: Wand2,
    desc: "Fix spelling & grammar",
  },
  {
    id: "expand" as Action,
    label: "Expand",
    icon: FileText,
    desc: "Add more detail",
  },
  {
    id: "tone" as Action,
    label: "Change tone",
    icon: MessageSquare,
    desc: "Adjust writing style",
  },
];

const TONES = [
  "professional",
  "casual",
  "formal",
  "friendly",
  "persuasive",
  "academic",
];

export default function AIPanel({ editor, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [action, setAction] = useState<Action>("summarize");
  const [tone, setTone] = useState("professional");
  const [copied, setCopied] = useState(false);

  const getContent = () => {
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    if (hasSelection) {
      return editor.state.doc.textBetween(from, to, "\n");
    }
    return editor.getText();
  };

  const run = async () => {
    const content = getContent();
    if (!content.trim()) {
      setResult("Nothing to process — write something in the editor first.");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, action, tone }),
      });

      if (!res.ok) throw new Error("AI request failed");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        fullText += chunk;
        setResult(fullText);
      }
    } catch (err) {
      setResult("Failed to get AI response. Check your GROQ_API_KEY.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyToEditor = () => {
    if (!result) return;
    if (action === "grammar" || action === "expand" || action === "tone") {
      editor.chain().focus().selectAll().insertContent(result).run();
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 border-l border-gray-200 bg-white flex flex-col flex-shrink-0 animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-purple-500" />
          <span className="text-sm font-medium text-gray-800">
            AI Assistant
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
        {/* Action selector */}
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAction(a.id)}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition ${
                action === a.id
                  ? "border-purple-300 bg-purple-50 text-purple-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
            >
              <a.icon size={16} />
              <span className="text-xs font-medium">{a.label}</span>
              <span className="text-xs text-gray-400">{a.desc}</span>
            </button>
          ))}
        </div>

        {action === "tone" && (
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">
              Target tone
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition capitalize ${
                    tone === t
                      ? "border-purple-300 bg-purple-50 text-purple-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400">
          {editor.state.selection.from !== editor.state.selection.to
            ? "✓ Will use selected text"
            : "Will use entire document"}
        </p>

        <button
          onClick={run}
          disabled={loading}
          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Sparkles size={15} />
          )}
          {loading ? "Processing…" : "Run"}
        </button>

        {result && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {result}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={copy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg transition"
              >
                {copied ? (
                  <Check size={12} className="text-green-500" />
                ) : (
                  <Copy size={12} />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
              {["grammar", "expand", "tone"].includes(action) && (
                <button
                  onClick={applyToEditor}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
                >
                  Apply to document
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
