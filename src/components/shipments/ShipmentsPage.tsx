"use client";

import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShipments } from "@/hooks/useShipments";
import { ShipmentTable } from "./ShipmentTable";
import { BulkPrintView } from "./BulkPrintView";

export function ShipmentsPage() {
  const s = useShipments();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">
              LOGISTICA · {s.stats.total} PAQUETES REGISTRADOS
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Despacho & Envios
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {s.selectedIds.length > 0 && (
              <Button
                size="sm"
                onClick={s.printBulkLabels}
                className="gap-1.5 text-xs font-bold shadow-xs"
              >
                <Printer className="size-3.5" aria-hidden />
                Imprimir {s.selectedIds.length} etiquetas
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={s.exportManifestCSV}
              className="gap-1.5 text-xs"
            >
              <Download className="size-3.5" aria-hidden />
              Exportar Manifiesto CSV
            </Button>
          </div>
        </header>

        <section aria-label="Resumen de Envios" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Por empaquetar
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-pending">{s.stats.pending}</p>
            <p className="mt-1 text-xs text-muted-foreground">Pagos confirmados en espera</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              En camino
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-transit">
              {s.stats.inTransit}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Despachados con chofer / guia</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Entregados con exito
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-success">
              {s.stats.delivered}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Ciclo completado</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total de envios
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {s.stats.total}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Historico acumulado</p>
          </div>
        </section>

        <ShipmentTable
          shipments={s.shipments}
          filteredShipments={s.filteredShipments}
          loading={s.loading}
          filter={s.filter}
          query={s.query}
          busyId={s.busyId}
          editingId={s.editingId}
          draft={s.draft}
          selectedIds={s.selectedIds}
          onFilterChange={s.setFilter}
          onQueryChange={s.setQuery}
          onToggleSelect={s.toggleSelect}
          onToggleSelectAll={s.toggleSelectAll}
          onStartEdit={s.startEdit}
          onUpdate={s.updateShipment}
          onDraftChange={s.setDraft}
          onCancelEdit={() => s.setEditingId(null)}
        />
      </div>

      {s.showBulkPrintView && (
        <BulkPrintView
          shipments={s.shipments}
          selectedIds={s.selectedIds}
          onClose={() => s.setShowBulkPrintView(false)}
        />
      )}
    </div>
  );
}
