"use client";

import { cn } from "@/lib/utils";
import { Search, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { useLeads } from "@/hooks/useLeads";
import { LeadTable, LeadDetailPanel } from "./LeadTable";
import { LeadFormModal } from "./LeadFormModal";

const TIER_FILTERS = [
  { id: "all", label: "Todas" },
  { id: "VIP", label: "VIP" },
  { id: "FREQUENT", label: "Recurrentes" },
  { id: "NEW", label: "Nuevas" },
  { id: "GHOST", label: "Sin pago" },
];

export function LeadsPage() {
  const l = useLeads();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
              DIRECTORIO · {l.stats.count} CLIENTAS REGISTRADAS
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Directorio de clientas
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={l.exportCsv} className="gap-1.5 text-xs">
              <Download className="size-3.5" aria-hidden />
              Exportar CSV
            </Button>
            <Button size="sm" onClick={l.openCreate} className="gap-1.5 text-xs font-semibold">
              <Plus className="size-3.5" aria-hidden />
              Nueva clienta
            </Button>
          </div>
        </header>

        <section aria-label="Resumen de clientas" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Valor de cartera
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-success">
              {money(l.stats.totalRevenue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {l.stats.totalOrders} compras pagadas
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Clientas VIP
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {l.stats.vipCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Mas de 3 compras en Lives</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Ticket promedio
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {money(l.stats.avgTicket)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Por cada compra cerrada</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total registradas
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {l.stats.count}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Base activa de WhatsApp</p>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div
            role="tablist"
            aria-label="Filtrar por categoria"
            className="flex gap-1 rounded-md bg-muted p-0.5"
          >
            {TIER_FILTERS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={l.tierFilter === t.id}
                onClick={() => l.setTierFilter(t.id)}
                className={cn(
                  "h-6 rounded px-2.5 text-xs font-medium transition-colors",
                  l.tierFilter === t.id
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label className="relative">
            <span className="sr-only">Buscar por nombre o telefono</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={l.search}
              onChange={(e) => l.setSearch(e.target.value)}
              placeholder="Nombre o telefono..."
              className="h-7 w-60 rounded-md border border-input bg-background pr-2 pl-8 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] items-start">
          <LeadTable
            leads={l.filteredLeads}
            selectedLead={l.selectedLead}
            loading={l.loading}
            onSelect={l.setSelectedId}
          />
          <LeadDetailPanel lead={l.selectedLead} onEdit={l.openEdit} />
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
    </div>
  );
}
