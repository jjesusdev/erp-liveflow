"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "connecting" | "connected" | "disconnected";

export function SocketStatus() {
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    const socket = (
      window as unknown as {
        __liveflowSocket?: { connected: boolean; on: (e: string, cb: () => void) => void };
      }
    ).__liveflowSocket;

    if (socket?.connected) {
      setStatus("connected");
    }

    const handleConnect = () => setStatus("connected");
    const handleDisconnect = () => setStatus("disconnected");

    if (socket) {
      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
    }

    const interval = setInterval(() => {
      const s = (window as unknown as { __liveflowSocket?: { connected: boolean } })
        .__liveflowSocket;
      if (s) {
        setStatus(s.connected ? "connected" : "disconnected");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const config: Record<Status, { label: string; className: string; icon: React.ReactNode }> = {
    connected: {
      label: "En linea",
      className: "text-emerald-500",
      icon: <Wifi className="size-3" />,
    },
    disconnected: {
      label: "Sin conexion",
      className: "text-red-400",
      icon: <WifiOff className="size-3" />,
    },
    connecting: {
      label: "Conectando...",
      className: "text-amber-400",
      icon: <Loader2 className="size-3 animate-spin" />,
    },
  };

  const { label, className, icon } = config[status];

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium",
        className
      )}
      title={`WebSocket: ${label}`}
      role="status"
      aria-live="polite"
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </div>
  );
}
