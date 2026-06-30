"use client";

import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isOnline: boolean;
  wsStatus: "connecting" | "connected" | "disconnected";
}

export default function ConnectionStatus({ isOnline, wsStatus }: Props) {
  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
        <WifiOff size={12} />
        <span>Offline</span>
      </div>
    );
  }

  if (wsStatus === "connected") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        <span>Live</span>
      </div>
    );
  }

  if (wsStatus === "connecting") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
        <Loader2 size={11} className="animate-spin" />
        <span>Connecting</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
      <Wifi size={12} />
      <span>Disconnected</span>
    </div>
  );
}
