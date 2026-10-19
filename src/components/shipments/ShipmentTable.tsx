"use client";

import { cn } from "@/lib/utils";
import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Square,
  Truck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/liveflow/primitives";
import type { Shipment } from "@/types";
import { PAGE_SIZE_OPTIONS } from "@/hooks/useShipments";
import {
  Avatar,
  SHIPMENT_LABEL,
  SHIPMENT_TONE,
  leadTier,
  waLink,
} from "@/components/leads/leads-ui";
import { folioOf } from "./shipments-ui";

const TO_DISPATCH = ["PENDING", "READY", "LABEL_PRINTED"];
const IN_TRANSIT = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"];

function pageWindow(current: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const out: (number | "gap")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) out.push("gap");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < totalPages - 1) out.push("gap");
  out.push(totalPages);
  return out;
}

interface ShipmentTableProps {
  shipments: Shipment[];
  selectedId: string | null;
  loading: boolean;
  busyId: string | null;
  selectedIds: string[];
  page: number;
  pageSize: number;
  total: number;
  onSelect: (id: string) => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}

export function ShipmentTable({
  shipments,
  selectedId,
  loading,
  busyId,
  selectedIds,
  page,
  pageSize,
  total,
  onSelect,
  onPage,
  onPageSize,
  onToggleSelect,
  onToggleSelectAll,
  onUpdate,
}: ShipmentTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const window = pageWindow(page, totalPages);
  const allSelected = shipments.length > 0 && selectedIds.length === shipments.length;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-card text-[11px] uppercase tracking-wider">
            <tr className="text-muted-foreground">
              <th scope="col" className="w-9 px-3 py-2.5">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  aria-label="Seleccionar todo"
                  className="flex items-center justify-center text-muted-foreground transition hover:text-foreground"
                >
                  {allSelected ? (
                    <CheckSquare className="size-4 text-success" aria-hidden />
                  ) : (
                    <Square className="size-4" aria-hidden />
                  )}
                </button>
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Folio
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Destinatario
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Destino
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Transporte
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Guia
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Estado
              </th>
              <th scope="col" className="w-24 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading &&
              Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td className="px-3 py-3">
                    <Skeleton className="size-4" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-3 w-16" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-3 w-20" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-3 w-20" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-3 w-16" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-5 w-20 rounded-[5px]" />
                  </td>
                  <td className="px-3 py-3" />
                </tr>
              ))}

            {!loading &&
              shipments.map((shipment) => {
                const isSelected = selectedId === shipment.id;
                const isChecked = selectedIds.includes(shipment.id);
                const status = shipment.status;
                const canDispatch = TO_DISPATCH.includes(status);
                const canDeliver = IN_TRANSIT.includes(status);
                const phone = shipment.lead?.phone || shipment.recipient?.phone || "";
                const tier = shipment.lead ? leadTier(shipment.lead) : undefined;

                return (
                  <tr
                    key={shipment.id}
                    onClick={() => onSelect(shipment.id)}
                    className={cn(
                      "group/row cursor-pointer border-l-2 transition-colors",
                      isSelected
                        ? "border-l-transit bg-muted/50"
                        : "border-l-transparent hover:bg-muted/30"
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelect(shipment.id);
                        }}
                        aria-label="Seleccionar envio"
                        className="flex items-center justify-center text-muted-foreground transition hover:text-foreground"
                      >
                        {isChecked ? (
                          <CheckSquare className="size-4 text-success" aria-hidden />
                        ) : (
                          <Square className="size-4" aria-hidden />
                        )}
                      </button>
                    </td>

                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                      {folioOf(shipment)}
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          name={shipment.lead?.name || shipment.recipient?.name}
                          tier={tier}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {shipment.lead?.name || shipment.recipient?.name || "Clienta"}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {phone || "Sin telefono"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-muted-foreground">
                      {shipment.lead?.addressCity || shipment.lead?.addressColonia ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground/70" aria-hidden />
                          {shipment.lead?.addressColonia || shipment.lead?.addressCity}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-muted-foreground">
                      {shipment.carrier || shipment.carrierRef?.name ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Truck className="size-3 text-muted-foreground/70" aria-hidden />
                          {shipment.carrier || shipment.carrierRef?.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">Sin definir</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                      {shipment.trackingNumber || (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      <Badge tone={SHIPMENT_TONE[status]}>{SHIPMENT_LABEL[status] || status}</Badge>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {phone && (
                          <a
                            href={waLink(phone)}
                            target="_blank"
                            rel="noreferrer"
                            title={`Escribir por WhatsApp a ${shipment.lead?.name || phone}`}
                            aria-label={`Abrir WhatsApp de ${shipment.lead?.name || phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-success/10 hover:text-success focus-visible:opacity-100 group-hover/row:opacity-100"
                          >
                            <MessageCircle className="size-4" aria-hidden />
                          </a>
                        )}
                        {canDispatch && (
                          <button
                            type="button"
                            title="Despachar paquete"
                            aria-label="Despachar paquete"
                            disabled={busyId === shipment.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdate(shipment.id, { status: "IN_TRANSIT" });
                            }}
                            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-transit/10 hover:text-transit focus-visible:opacity-100 group-hover/row:opacity-100 disabled:opacity-40"
                          >
                            <Send className="size-4" aria-hidden />
                          </button>
                        )}
                        {canDeliver && (
                          <button
                            type="button"
                            title="Marcar como entregado"
                            aria-label="Marcar como entregado"
                            disabled={busyId === shipment.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdate(shipment.id, { status: "DELIVERED" });
                            }}
                            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-success/10 hover:text-success focus-visible:opacity-100 group-hover/row:opacity-100 disabled:opacity-40"
                          >
                            <Check className="size-4" aria-hidden />
                          </button>
                        )}
                        <ChevronRight
                          className={cn(
                            "size-4 transition-opacity",
                            isSelected ? "text-foreground opacity-100" : "opacity-25"
                          )}
                          aria-hidden
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

            {!loading && shipments.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex size-11 items-center justify-center rounded-full bg-muted">
                      <Search className="size-5 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      No hay envios en este filtro.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ajusta la busqueda o cambia el estado seleccionado.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            Mostrando{" "}
            <span className="font-medium tabular-nums text-foreground">
              {from.toLocaleString("es-CL")}–{to.toLocaleString("es-CL")}
            </span>{" "}
            de{" "}
            <span className="font-medium tabular-nums text-foreground">
              {total.toLocaleString("es-CL")}
            </span>{" "}
            envios
          </p>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" role="navigation" aria-label="Paginacion">
              <button
                type="button"
                onClick={() => onPage(page - 1)}
                disabled={page <= 1}
                aria-label="Pagina anterior"
                className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" aria-hidden />
              </button>
              {window.map((item, i) =>
                item === "gap" ? (
                  <span key={`gap-${i}`} className="px-1 text-[11px] text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPage(item)}
                    aria-current={item === page ? "page" : undefined}
                    className={cn(
                      "h-7 min-w-7 rounded-md px-2 text-[11px] font-medium tabular-nums transition",
                      item === page
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => onPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Pagina siguiente"
                className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="size-3.5" aria-hidden />
              </button>
            </div>

            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="sr-only">Envios por pagina</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSize(Number(e.target.value))}
                className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px] tabular-nums text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} / pág.
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
