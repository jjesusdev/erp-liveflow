"use client";

import { cn } from "@/lib/utils";
import { Download, Printer, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShipments } from "@/hooks/useShipments";
import { ShipmentTable } from "./ShipmentTable";
import { ShipmentDetailPanel } from "./ShipmentDetailPanel";
import { BulkPrintView } from "./BulkPrintView";

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "TO_DISPATCH", label: "Por despachar" },
  { id: "IN_TRANSIT", label: "En camino" },
  { id: "DELIVERED", label: "Entregados" },
  { id: "ISSUES", label: "Incidencias" },
] as const;

export function ShipmentsPage() {
  const s = useShipments();
  const hasFilter = s.query.trim().length > 0 || s.filter !== "all";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin bg-background">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-4 p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Logistica
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Envios</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium tabular-nums text-foreground">
                {s.total.toLocaleString("es-CL")}
              </span>{" "}
              envios ·{" "}
              <span className="tabular-nums text-pending">
                {s.counts.TO_DISPATCH.toLocaleString("es-CL")}
              </span>{" "}
              por despachar ·{" "}
              <span className="tabular-nums text-transit">
                {s.counts.IN_TRANSIT.toLocaleString("es-CL")}
              </span>{" "}
              en camino ·{" "}
              <span className="tabular-nums text-success">
                {s.counts.DELIVERED.toLocaleString("es-CL")}
              </span>{" "}
              entregados
            </p>
          </div>
          <div className="flex items-center gap-2">
            {s.selectedIds.length > 0 && (
              <Button onClick={s.printBulkLabels} className="gap-1.5 text-xs font-semibold">
                <Printer className="size-3.5" aria-hidden />
                Imprimir {s.selectedIds.length} etiquetas
              </Button>
            )}
            <Button
              variant="outline"
              onClick={s.exportManifestCSV}
              className="gap-1.5 text-xs"
              title="Exporta el filtro actual completo, no solo esta pagina"
            >
              <Download className="size-3.5" aria-hidden />
              Exportar manifiesto
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
          <div
            role="tablist"
            aria-label="Filtrar por estado"
            className="flex flex-wrap items-center gap-0.5 rounded-lg bg-muted p-0.5"
          >
            {FILTERS.map((f) => {
              const active = s.filter === f.id;
              const count = s.counts[f.id];
              return (
                <button
                  key={f.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => s.setFilter(f.id)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-background font-semibold text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "tabular-nums",
                      active ? "text-muted-foreground" : "text-muted-foreground/70"
                    )}
                  >
                    {count.toLocaleString("es-CL")}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label className="relative">
              <span className="sr-only">Buscar por clienta, comuna o guia</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                value={s.query}
                onChange={(e) => s.setQuery(e.target.value)}
                placeholder="Clienta, comuna o guia..."
                className="h-8 w-64 rounded-lg border border-input bg-background pr-8 pl-8 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              {s.query && (
                <button
                  type="button"
                  onClick={() => s.setQuery("")}
                  aria-label="Limpiar busqueda"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </label>
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  s.setQuery("");
                  s.setFilter("all");
                }}
                className="text-xs"
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ShipmentTable
            shipments={s.shipments}
            selectedId={s.selectedId}
            loading={s.loading}
            busyId={s.busyId}
            selectedIds={s.selectedIds}
            page={s.page}
            pageSize={s.pageSize}
            total={s.total}
            onSelect={(id) => s.setSelectedId(id === s.selectedId ? null : id)}
            onPage={s.setPage}
            onPageSize={s.changePageSize}
            onToggleSelect={s.toggleSelect}
            onToggleSelectAll={s.toggleSelectAll}
            onUpdate={s.updateShipment}
          />
          <ShipmentDetailPanel
            shipment={s.detail}
            loading={s.detailLoading}
            carriers={s.carriers}
            busy={Boolean(s.busyId && s.busyId === s.selectedId)}
            onUpdate={s.updateShipment}
            onPrint={s.printOne}
            onClose={() => s.setSelectedId(null)}
          />
        </div>
      </div>

      {s.showBulkPrintView && (
        <BulkPrintView
          shipments={s.printTargets}
          selectedIds={s.printTargets.map((t) => t.id)}
          onClose={() => s.setShowBulkPrintView(false)}
        />
      )}
    </div>
  );
}
