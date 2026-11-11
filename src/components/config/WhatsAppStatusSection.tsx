"use client";

import { useEffect, useState } from "react";
import { Smartphone, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/liveflow/primitives";
import { toast } from "sonner";

type WhatsAppStatus =
  "conectado" | "qr_pendiente" | "reconectando" | "desconectado" | "desconocido";

interface HealthResponse {
  status: string;
  dependencies: {
    whatsapp?: { status: string; detail?: string };
    db?: { status: string; detail?: string };
    workers?: { status: string; detail?: string };
  };
}

function mapHealthToWhatsAppStatus(health: HealthResponse | null): WhatsAppStatus {
  const wa = health?.dependencies?.whatsapp;
  if (!wa) return "desconocido";

  const status = wa.status;
  const detail = (wa.detail || "").toLowerCase();

  if (status === "up") {
    if (detail.includes("authstate: open")) return "conectado";
    return "conectado";
  }
  if (detail.includes("qr")) return "qr_pendiente";
  if (detail.includes("reconect")) return "reconectando";
  return "desconectado";
}

function statusLabel(status: WhatsAppStatus): string {
  const labels: Record<WhatsAppStatus, string> = {
    conectado: "Conectado",
    qr_pendiente: "Esperando QR",
    reconectando: "Reconectando",
    desconectado: "Desconectado",
    desconocido: "Desconocido",
  };
  return labels[status];
}

function statusTone(
  status: WhatsAppStatus
): "neutral" | "live" | "success" | "pending" | "transit" | "vip" {
  const tones: Record<
    WhatsAppStatus,
    "neutral" | "live" | "success" | "pending" | "transit" | "vip"
  > = {
    conectado: "success",
    qr_pendiente: "pending",
    reconectando: "transit",
    desconectado: "neutral",
    desconocido: "neutral",
  };
  return tones[status];
}

export function WhatsAppStatusSection() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchHealth() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setHealth(data);
        }
      } catch {
        // No fallar la UI si el endpoint no está disponible
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  const whatsAppStatus = mapHealthToWhatsAppStatus(health);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Cargando estado...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="size-4" />
          <h3 className="text-sm font-semibold text-foreground">Estado de WhatsApp</h3>
        </div>
        <Badge tone={statusTone(whatsAppStatus)} data-testid="whatsapp-status">
          {statusLabel(whatsAppStatus)}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
        <span>Base de datos</span>
        <Badge
          tone={health?.dependencies?.db?.status === "up" ? "success" : "neutral"}
          data-testid="db-status"
        >
          {health?.dependencies?.db?.status === "up" ? "Online" : "Caída"}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
        <span>Workers</span>
        <Badge
          tone={health?.dependencies?.workers?.status === "up" ? "success" : "neutral"}
          data-testid="workers-status"
        >
          {health?.dependencies?.workers?.status === "up" ? "Activos" : "Inactivos"}
        </Badge>
      </div>

      {whatsAppStatus === "qr_pendiente" && (
        <div className="rounded-md border border-dashed border-border bg-muted/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <WifiOff className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Esperando escaneo de QR</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Escanea el código QR desde la consola del servidor para vincular WhatsApp.
          </p>
        </div>
      )}

      {whatsAppStatus === "desconectado" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.warning("Reconexión manual desde el servidor")}
          className="w-full"
        >
          Reconectar WhatsApp
        </Button>
      )}
    </div>
  );
}
