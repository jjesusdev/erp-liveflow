"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/lib/socket";
import type { WhatsAppStatusPayload } from "@/lib/realtime/events";

export interface UseWhatsAppStatusResult {
  /** Último payload recibido de `whatsapp:status`; `null` hasta la primera respuesta. */
  status: WhatsAppStatusPayload | null;
  /** Conexión del socket contra el servidor (no el estado de WhatsApp). */
  connected: boolean;
}

/**
 * Suscribe `whatsapp:status` y pide el estado inicial al conectarse.
 * `useSocket` devuelve null al desconectar y el socket al reconectar, así que el
 * efecto se vuelve a ejecutar y reenvía `whatsapp:status:request` automáticamente.
 */
export function useWhatsAppStatus(): UseWhatsAppStatusResult {
  const socket = useSocket();
  const [status, setStatus] = useState<WhatsAppStatusPayload | null>(null);

  useEffect(() => {
    if (!socket) return;

    const onStatus = (next: WhatsAppStatusPayload) => setStatus(next ?? null);
    socket.on("whatsapp:status", onStatus);
    socket.emit("whatsapp:status:request");

    return () => {
      socket.off("whatsapp:status", onStatus);
    };
  }, [socket]);

  return { status, connected: Boolean(socket) };
}
