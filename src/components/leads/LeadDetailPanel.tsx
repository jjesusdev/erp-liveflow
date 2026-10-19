"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Check,
  Copy,
  Loader2,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Pencil,
  Receipt,
  Truck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge, TierBadge } from "@/components/liveflow/primitives";
import { money } from "@/lib/format";
import { formatDate, timeAgo } from "@/lib/date-utils";
import type { Lead } from "@/types";
import {
  Avatar,
  CompositionBar,
  Meter,
  PAYMENT_LABEL,
  PAYMENT_TONE,
  SHIPMENT_LABEL,
  SHIPMENT_TONE,
  TOKEN_BG,
  leadAvgTicket,
  leadTier,
  waLink,
} from "./leads-ui";

interface LeadDetailPanelProps {
  lead: Lead | null;
  onEdit: (lead: Lead) => void;
  onOpenChat: (lead: Lead) => void;
  onOpenCharge: (lead: Lead) => void;
  busy: boolean;
  portfolioShare: number;
}

type Activity = {
  id: string;
  icon: LucideIcon;
  tone: keyof typeof TOKEN_BG;
  title: string;
  meta: string;
  date: string;
};

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-sm font-semibold tabular-nums", tone || "text-foreground")}>
        {value}
      </p>
    </div>
  );
}

function Timeline({ items }: { items: Activity[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <li key={it.id} className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-background",
                TOKEN_BG[it.tone]
              )}
              aria-hidden
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-foreground">{it.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{it.meta}</p>
            </div>
            <time className="shrink-0 pt-0.5 text-[10px] text-muted-foreground">
              {timeAgo(it.date)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}

function EmptyHint({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
      <Icon className="size-5 text-muted-foreground/70" aria-hidden />
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function LeadDetailPanel({
  lead,
  onEdit,
  onOpenChat,
  onOpenCharge,
  busy,
  portfolioShare,
}: LeadDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  const activities = useMemo<Activity[]>(() => {
    if (!lead) return [];
    const items: Activity[] = [];

    items.push({
      id: `contact-${lead.id}`,
      icon: UserPlus,
      tone: "neutral",
      title: "Primer contacto",
      meta: `Desde ${lead.source?.replace(/_/g, " ") || "WhatsApp"}`,
      date: lead.firstContactAt,
    });

    for (const order of lead.paymentOrders || []) {
      items.push({
        id: `order-${order.id}`,
        icon: Receipt,
        tone: PAYMENT_TONE[order.status],
        title: order.concept,
        meta: `${money(Number(order.amount))} · ${PAYMENT_LABEL[order.status] || order.status}`,
        date: order.paidAt || order.createdAt,
      });
    }

    for (const shipment of lead.shipments || []) {
      items.push({
        id: `ship-${shipment.id}`,
        icon: Truck,
        tone: SHIPMENT_TONE[shipment.status],
        title: shipment.carrier || "Envio local",
        meta: `${shipment.trackingNumber || "Sin guia"} · ${
          SHIPMENT_LABEL[shipment.status] || shipment.status
        }`,
        date: shipment.createdAt,
      });
    }

    return items.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  }, [lead]);

  if (!lead) {
    return (
      <aside
        aria-label="Ficha de la clienta"
        className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Users className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Ficha de la clienta</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Selecciona una clienta para ver su historial, su valor y las acciones rápidas.
          </p>
        </div>
      </aside>
    );
  }

  const tier = leadTier(lead);
  const avg = leadAvgTicket(lead);
  const orders = lead.paymentOrders || [];
  const shipments = lead.shipments || [];
  const paid = orders.filter((o) => o.status === "PAID");

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(lead.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard no disponible
    }
  };

  return (
    <aside
      aria-label="Ficha de la clienta"
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)]"
    >
      <header className="relative shrink-0 overflow-hidden border-b border-border p-4">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative flex items-start gap-3">
          <Avatar name={lead.name} tier={tier} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
              {lead.name || "Clienta sin nombre"}
            </h2>
            <div className="mt-1.5 flex items-center gap-2">
              <TierBadge tier={tier} />
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <CalendarDays className="size-3" aria-hidden />
                {formatDate(lead.firstContactAt)}
              </span>
            </div>
            <button
              type="button"
              onClick={copyPhone}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-background/70 px-2 py-1 font-mono text-[11px] text-muted-foreground transition hover:text-foreground"
              aria-label="Copiar telefono"
            >
              {lead.phone}
              {copied ? (
                <Check className="size-3 text-success" aria-hidden />
              ) : (
                <Copy className="size-3" aria-hidden />
              )}
            </button>
          </div>
        </div>

        <div className="relative mt-3 grid grid-cols-3 gap-2">
          <Metric label="Valor" value={money(lead.totalSpent || 0)} tone="text-success" />
          <Metric label="Compras" value={String(lead.totalPaidCount || 0)} />
          <Metric label="Ticket" value={money(avg)} />
        </div>

        <div className="relative mt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Participacion en la cartera</span>
            <span className="font-semibold text-foreground">{portfolioShare.toFixed(1)}%</span>
          </div>
          <Meter
            value={portfolioShare}
            tone={tier === "vip" ? "vip" : "success"}
            className="mt-1.5"
          />
        </div>
      </header>

      <div className="flex shrink-0 flex-col gap-2 border-b border-border p-4">
        <div className="grid grid-cols-2 gap-2">
          <a
            href={waLink(lead.phone)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-success text-xs font-semibold text-success-foreground transition-colors hover:bg-success/90"
          >
            <MessageCircle className="size-3.5" aria-hidden />
            WhatsApp
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChat(lead)}
            disabled={busy}
            className="w-full gap-1.5 text-xs"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <MessagesSquare className="size-3.5" aria-hidden />
            )}
            Abrir chat
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="success"
            size="sm"
            onClick={() => onOpenCharge(lead)}
            disabled={busy}
            className="w-full gap-1.5 text-xs font-semibold"
          >
            <Receipt className="size-3.5" aria-hidden />
            Cobro express
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(lead)}
            className="w-full gap-1.5 text-xs"
          >
            <Pencil className="size-3.5" aria-hidden />
            Editar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="resumen" className="flex min-h-0 flex-1 flex-col">
        <div className="px-4 pt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="pedidos">
              Pedidos{orders.length ? ` (${orders.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="envios">
              Envíos{shipments.length ? ` (${shipments.length})` : ""}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-4">
          <TabsContent value="resumen" className="mt-0 flex flex-col gap-4">
            <section>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Actividad
              </p>
              <Timeline items={activities} />
            </section>

            <section>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Dirección de entrega
              </p>
              <div className="rounded-lg border border-border bg-background/60 p-3 text-xs">
                {lead.addressStreet ? (
                  <>
                    <p className="font-medium text-foreground">
                      {lead.addressStreet} {lead.addressNumber}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {lead.addressColonia ? `Col. ${lead.addressColonia}, ` : ""}
                      {lead.addressCity} {lead.addressState} · CP {lead.addressZipCode}
                    </p>
                    {lead.addressNotes && (
                      <p className="mt-1.5 border-t border-border pt-1.5 text-[11px] italic text-muted-foreground">
                        Ref: {lead.addressNotes}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden />
                    <p className="text-[11px] italic">Sin dirección capturada aún.</p>
                  </div>
                )}
              </div>
            </section>

            {lead.internalNotes && (
              <section>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-pending">
                  Notas privadas del equipo
                </p>
                <div className="rounded-lg border border-pending/20 bg-pending/5 p-3 text-[12px] leading-relaxed text-foreground">
                  {lead.internalNotes}
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="pedidos" className="mt-0 flex flex-col gap-3">
            {paid.length > 0 && (
              <CompositionBar
                parts={[
                  { label: "Pagados", value: paid.length, tone: "success" },
                  {
                    label: "En curso",
                    value: orders.filter((o) => o.status === "SENT" || o.status === "PENDING")
                      .length,
                    tone: "transit",
                  },
                  {
                    label: "Sin pago",
                    value: orders.filter((o) => o.status === "EXPIRED" || o.status === "CANCELLED")
                      .length,
                    tone: "live",
                  },
                ]}
              />
            )}
            {orders.length === 0 ? (
              <EmptyHint icon={Receipt} label="Esta clienta aún no tiene pedidos registrados." />
            ) : (
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-background/60">
                {orders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-foreground">
                        {order.concept}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[12px] font-semibold tabular-nums text-foreground">
                        {money(Number(order.amount))}
                      </p>
                      <div className="mt-1">
                        <Badge tone={PAYMENT_TONE[order.status]}>
                          {PAYMENT_LABEL[order.status] || order.status}
                        </Badge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="envios" className="mt-0 flex flex-col gap-3">
            {shipments.length === 0 ? (
              <EmptyHint icon={Truck} label="Todavía no hay envíos para esta clienta." />
            ) : (
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-background/60">
                {shipments.map((shipment) => (
                  <li key={shipment.id} className="flex items-center justify-between gap-2 p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Truck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-foreground">
                          {shipment.carrier || "Envío local"}
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {shipment.trackingNumber || "Sin guía"}
                        </p>
                      </div>
                    </div>
                    <Badge tone={SHIPMENT_TONE[shipment.status]}>
                      {SHIPMENT_LABEL[shipment.status] || shipment.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
