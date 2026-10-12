"use client";

import { Search } from "lucide-react";

const STATUS_FILTERS = [
  { id: "all", label: "Todos los estados" },
  { id: "PAID", label: "Pagados" },
  { id: "SENT", label: "Por pagar / Enviados" },
  { id: "PENDING", label: "Pendientes" },
  { id: "CANCELLED", label: "Cancelados" },
];

const PROVIDER_FILTERS = [
  { id: "all", label: "Todos los metodos" },
  { id: "TRANSFER", label: "Transferencia Directa" },
  { id: "MERCADOPAGO", label: "MercadoPago" },
  { id: "CASH", label: "Efectivo" },
];

const DATE_RANGES = [
  { id: "today", label: "Hoy (Live actual)" },
  { id: "week", label: "Ultimos 7 dias" },
  { id: "month", label: "Este mes" },
  { id: "all", label: "Historico completo" },
];

interface CajaFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  dateRange: string;
  onDateRangeChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  providerFilter: string;
  onProviderFilterChange: (v: string) => void;
}

export function CajaFilters({
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  providerFilter,
  onProviderFilterChange,
}: CajaFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por cliente, prenda o folio..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium"
        >
          {DATE_RANGES.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={providerFilter}
          onChange={(e) => onProviderFilterChange(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium"
        >
          {PROVIDER_FILTERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
