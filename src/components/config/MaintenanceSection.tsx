"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

async function runMaintenance(action: string, confirmMsg: string) {
  if (!confirm(confirmMsg)) return;
  try {
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    toast.success(data.message || "Mantenimiento completado");
  } catch {
    toast.error("Error ejecutando mantenimiento");
  }
}

export function MaintenanceSection() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs max-w-2xl">
      <div className="border-b border-border pb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Mantenimiento & Salud de Base de Datos
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Herramientas para depurar registros antiguos y mantener PostgreSQL rapido y liviano.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
          <div>
            <p className="text-xs font-semibold text-foreground">Limpieza de Auditoria Antigua</p>
            <p className="text-[11px] text-muted-foreground">
              Elimina logs de actividad de mas de 30 dias.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              runMaintenance("PURGE_OLD_LOGS", "Deseas purgar logs de mas de 30 dias?")
            }
            className="h-7 text-xs"
          >
            Purgar Logs
          </Button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
          <div>
            <p className="text-xs font-semibold text-foreground">Depurar Ordenes Canceladas</p>
            <p className="text-[11px] text-muted-foreground">
              Elimina carritos y apartados vencidos antiguos.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() =>
              runMaintenance("RESET_TEST_DATA", "Deseas depurar apartados expirados y cancelados?")
            }
            className="h-7 text-xs"
          >
            Depurar Ordenes
          </Button>
        </div>
      </div>
    </div>
  );
}
