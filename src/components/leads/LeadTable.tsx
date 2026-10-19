"use client";

import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Search,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TierBadge } from "@/components/liveflow/primitives";
import { money } from "@/lib/format";
import { timeAgo } from "@/lib/date-utils";
import type { Lead } from "@/types";
import { PAGE_SIZE_OPTIONS, type LeadSortKey, type SortDir } from "@/hooks/useLeads";
import { Avatar, lastPaidAt, leadAvgTicket, leadTier, waLink } from "./leads-ui";

interface SortHeaderProps {
  label: string;
  sortKey: LeadSortKey;
  activeKey: LeadSortKey;
  dir: SortDir;
  onSort: (key: LeadSortKey) => void;
  align?: "left" | "right";
}

function SortHeader({ label, sortKey, activeKey, dir, onSort, align = "left" }: SortHeaderProps) {
  const active = activeKey === sortKey;
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3 py-2.5 font-medium", align === "right" && "text-right")}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "group inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : (
            <ArrowDown className="size-3" aria-hidden />
          )
        ) : (
          <ArrowUpDown
            className="size-3 opacity-0 transition-opacity group-hover:opacity-60"
            aria-hidden
          />
        )}
      </button>
    </th>
  );
}

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

interface LeadTableProps {
  leads: Lead[];
  selectedLead: Lead | null;
  loading: boolean;
  sortKey: LeadSortKey;
  sortDir: SortDir;
  onSort: (key: LeadSortKey) => void;
  onSelect: (id: string) => void;
  onOpenChat: (lead: Lead) => void;
  total: number;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}

export function LeadTable({
  leads,
  selectedLead,
  loading,
  sortKey,
  sortDir,
  onSort,
  onSelect,
  onOpenChat,
  total,
  page,
  pageSize,
  onPage,
  onPageSize,
}: LeadTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const window = pageWindow(page, totalPages);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-card text-[11px] uppercase tracking-wider">
            <tr>
              <SortHeader
                label="Clienta"
                sortKey="name"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label="Nivel"
                sortKey="tier"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label="Ciudad"
                sortKey="city"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortHeader
                label="Pedidos"
                sortKey="orders"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                align="right"
              />
              <SortHeader
                label="Ticket"
                sortKey="ticket"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                align="right"
              />
              <SortHeader
                label="Ultima compra"
                sortKey="recent"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                align="right"
              />
              <th scope="col" className="w-20 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading &&
              Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
                <tr key={`sk-${i}`}>
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
                    <Skeleton className="h-5 w-16 rounded-[5px]" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-3 w-16" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="ml-auto h-3 w-6" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="ml-auto h-3 w-14" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="ml-auto h-3 w-16" />
                  </td>
                  <td className="px-3 py-3" />
                </tr>
              ))}

            {!loading &&
              leads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;
                const tier = leadTier(lead);
                const last = lastPaidAt(lead);

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelect(lead.id)}
                    className={cn(
                      "group/row cursor-pointer border-l-2 transition-colors",
                      isSelected
                        ? "border-l-success bg-muted/50"
                        : "border-l-transparent hover:bg-muted/30"
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={lead.name} tier={tier} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {lead.name || "Sin nombre"}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {lead.phone}
                            <span className="mx-1 text-border">·</span>
                            <span className="capitalize">
                              {lead.source?.replace(/_/g, " ") || "WhatsApp"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <TierBadge tier={tier} />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {lead.addressCity ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground/70" aria-hidden />
                          {lead.addressCity}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums text-foreground">
                      {lead.totalPaidCount || 0}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {money(leadAvgTicket(lead))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[12px] text-muted-foreground">
                      {last ? timeAgo(last) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={waLink(lead.phone)}
                          target="_blank"
                          rel="noreferrer"
                          title={`Escribir por WhatsApp a ${lead.name || lead.phone}`}
                          aria-label={`Abrir WhatsApp de ${lead.name || lead.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-success/10 hover:text-success focus-visible:opacity-100 group-hover/row:opacity-100"
                        >
                          <MessageCircle className="size-4" aria-hidden />
                        </a>
                        <button
                          type="button"
                          title="Abrir chat"
                          aria-label={`Abrir chat de ${lead.name || lead.phone}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenChat(lead);
                          }}
                          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-transit/10 hover:text-transit focus-visible:opacity-100 group-hover/row:opacity-100"
                        >
                          <MessagesSquare className="size-4" aria-hidden />
                        </button>
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

            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex size-11 items-center justify-center rounded-full bg-muted">
                      <Search className="size-5 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      No hay clientas en este filtro.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ajusta la busqueda o registra una nueva clienta.
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
              {from.toLocaleString("es-MX")}–{to.toLocaleString("es-MX")}
            </span>{" "}
            de{" "}
            <span className="font-medium tabular-nums text-foreground">
              {total.toLocaleString("es-MX")}
            </span>{" "}
            clientas
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
              <span className="sr-only">Clientas por pagina</span>
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
