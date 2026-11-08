"use client";

import { useState } from "react";
import { Bell, Send, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "./ToggleSwitch";
import { Badge } from "@/components/liveflow/primitives";
import { toast } from "sonner";
import type { BusinessConfig } from "@/types";

interface RemindersSectionProps {
  config: BusinessConfig;
  onChange: (config: BusinessConfig) => void;
}

export function RemindersSection({ config, onChange }: RemindersSectionProps) {
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reminderStats, setReminderStats] = useState<{
    pendingCount: number;
  } | null>(null);

  const handleSendReminders = async (dryRun = false) => {
    setSending(true);
    try {
      const res = await fetch("/api/caja/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderType: "PENDING_ONLY",
          customMessage: null,
          dryRun,
        }),
      });

      const data = await res.json();

      if (dryRun) {
        toast.success(`Modo prueba: ${data.totalPending} órdenes identificadas para recordatorio`);
      } else {
        toast.success(`Recordatorios enviados: ${data.sentCount} mensajes`);
      }
    } catch {
      toast.error("Error al enviar recordatorios");
    } finally {
      setSending(false);
    }
  };

  const fetchStats = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/caja/reminders");
      if (res.ok) {
        const data = await res.json();
        setReminderStats({ pendingCount: data.pendingCount || 0 });
      }
    } catch {
      toast.error("Error al obtener estadísticas");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5 shadow-xs max-w-2xl">
      <div className="border-b border-border pb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Recordatorios Automáticos de Pagos
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Notifica a clientas con órdenes de pago pendientes o próximas a expirar.
        </p>
      </div>

      <ToggleSwitch
        checked={Boolean(config.reminderEnabled)}
        onToggle={() => onChange({ ...config, reminderEnabled: !config.reminderEnabled })}
        label="Recordatorios automáticos"
        description="El sistema envía recordatorios automáticos antes de que expire el apartado."
      />

      {config.reminderEnabled && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
            <div>
              <label
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                htmlFor="cfg-reminder-min"
              >
                Minutos antes de expirar
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="cfg-reminder-min"
                  type="number"
                  min="5"
                  max="1440"
                  value={config.reminderBeforeMinutes || 15}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      reminderBeforeMinutes: parseInt(e.target.value, 10) || 15,
                    })
                  }
                  className="h-8 w-24 rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <span className="text-xs text-muted-foreground font-medium">minutos</span>
              </div>
            </div>

            <div className="flex items-center text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
              Los recordatorios se enviarán a las{" "}
              <strong>{config.reminderBeforeMinutes || 15} minutos</strong> antes de la expiración.
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="text-xs font-semibold text-foreground mb-2">Acciones</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchStats()}
                disabled={refreshing}
                className="h-8 gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                {refreshing ? "Actualizando..." : "Verificar pendientes"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendReminders(true)}
                disabled={sending}
                className="h-8 gap-1.5"
              >
                <Bell className="size-3.5" />
                {sending ? "Simulando..." : "Modo prueba"}
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => handleSendReminders(false)}
                disabled={sending}
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="size-3.5" />
                {sending ? "Enviando..." : "Enviar recordatorios"}
              </Button>
            </div>

            {reminderStats && (
              <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Badge tone="live">{reminderStats.pendingCount}</Badge>
                  <span className="text-xs text-muted-foreground">
                    órdenes pendientes por recordar
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
