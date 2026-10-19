"use client";

import { cn } from "@/lib/utils";
import { Download, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/hooks/useLeads";
import { LeadTable } from "./LeadTable";
import { LeadDetailPanel } from "./LeadDetailPanel";
import { LeadFormModal } from "./LeadFormModal";
import { PaymentModal } from "@/components/payment/PaymentModal";

export function LeadsPage() {
  const l = useLeads();

  const portfolioShare =
    l.selectedLead && l.totals.revenue > 0
      ? ((l.selectedLead.totalSpent || 0) / l.totals.revenue) * 100
      : 0;

  const hasFilter = l.search.trim().length > 0 || l.tierFilter !== "all";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin bg-background">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-4 p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Directorio
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Clientas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilter ? (
                <>
                  <span className="font-medium tabular-nums text-foreground">
                    {l.total.toLocaleString("es-MX")}
                  </span>{" "}
                  resultados de {l.totals.count.toLocaleString("es-MX")} clientas
                </>
              ) : (
                <>
                  <span className="font-medium tabular-nums text-foreground">
                    {l.totals.count.toLocaleString("es-MX")}
                  </span>{" "}
                  clientas · {l.totals.active30.toLocaleString("es-MX")} con actividad en 30 días
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={l.exportCsv}
              className="gap-1.5 text-xs"
              title="Exporta el filtro actual completo, no solo esta pagina"
            >
              <Download className="size-3.5" aria-hidden />
              Exportar
            </Button>
            <Button onClick={l.openCreate} className="gap-1.5 text-xs font-semibold">
              <Plus className="size-3.5" aria-hidden />
              Nueva clienta
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
          <div
            role="tablist"
            aria-label="Filtrar por segmento"
            className="flex flex-wrap items-center gap-0.5 rounded-lg bg-muted p-0.5"
          >
            {l.segments.map((s) => {
              const active = l.tierFilter === s.id;
              return (
                <button
                  key={s.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => l.changeTier(s.id)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-background font-semibold text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                  <span
                    className={cn(
                      "tabular-nums",
                      active ? "text-muted-foreground" : "text-muted-foreground/70"
                    )}
                  >
                    {s.count.toLocaleString("es-MX")}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label className="relative">
              <span className="sr-only">Buscar por nombre o teléfono</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                value={l.search}
                onChange={(e) => l.setSearch(e.target.value)}
                placeholder="Nombre o teléfono..."
                className="h-8 w-64 rounded-lg border border-input bg-background pr-8 pl-8 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              {l.search && (
                <button
                  type="button"
                  onClick={() => l.setSearch("")}
                  aria-label="Limpiar búsqueda"
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
                  l.setSearch("");
                  l.changeTier("all");
                }}
                className="text-xs"
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <LeadTable
            leads={l.leads}
            selectedLead={l.selectedLead}
            loading={l.loading}
            sortKey={l.sortKey}
            sortDir={l.sortDir}
            onSort={l.toggleSort}
            onSelect={l.setSelectedId}
            onOpenChat={l.openChat}
            total={l.total}
            page={l.page}
            pageSize={l.pageSize}
            onPage={l.setPage}
            onPageSize={l.changePageSize}
          />
          <LeadDetailPanel
            lead={l.selectedLead}
            onEdit={l.openEdit}
            onOpenChat={l.openChat}
            onOpenCharge={l.openCharge}
            busy={Boolean(l.actionBusyId)}
            portfolioShare={portfolioShare}
          />
        </div>
      </div>

      {l.showModal && (
        <LeadFormModal
          editingLead={l.editingLead}
          form={l.form}
          onFormChange={l.setForm}
          saving={l.saving}
          onSave={l.handleSave}
          onClose={() => l.setShowModal(false)}
        />
      )}

      {l.chargeTarget && (
        <PaymentModal
          open
          onOpenChange={(open) => {
            if (!open) {
              l.setChargeTarget(null);
              l.fetchLeads();
            }
          }}
          conversationId={l.chargeTarget.conversationId}
          leadName={l.chargeTarget.lead.name || l.chargeTarget.lead.phone}
        />
      )}
    </div>
  );
}
