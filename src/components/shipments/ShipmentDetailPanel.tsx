"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Printer,
  Send,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/liveflow/primitives";
import { money } from "@/lib/format";
import { formatDate, timeAgo } from "@/lib/date-utils";
import type { Carrier, Shipment } from "@/types";
import {
  Avatar,
  SHIPMENT_LABEL,
  SHIPMENT_TONE,
  TOKEN_BG,
  leadTier,
  waLink,
} from "@/components/leads/leads-ui";
import { folioOf, SHIPMENT_ICON, toneText, weightLabel } from "./shipments-ui";

const TO_DISPATCH = ["PENDING", "READY", "LABEL_PRINTED"];
const IN_TRANSIT = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"];

const FALLBACK_CARRIERS = [
  "Moto propia",
  "Camioneta propia",
  "Retiro en tienda",
  "Chilexpress",
  "Blue Express",
  "Starken",
  "Correos de Chile",
  "Otro",
];

interface ShipmentDetailPanelProps {
  shipment: Shipment | null;
  loading: boolean;
  carriers: Carrier[];
  busy: boolean;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onPrint: (shipment: Shipment) => void;
  onClose: () => void;
}

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

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  );
}

type EventItem = {
  id: string;
  icon: LucideIcon;
  tone: keyof typeof TOKEN_BG;
  title: string;
  meta: string;
  date: string;
};

export function ShipmentDetailPanel({
  shipment,
  loading,
  carriers,
  busy,
  onUpdate,
  onPrint,
  onClose,
}: ShipmentDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ carrier: "", trackingNumber: "", notes: "" });

  const shipmentId = shipment?.id;

  useEffect(() => {
    if (!shipment) return;
    setEditing(false);
    setDraft({
      carrier: shipment.carrier || shipment.carrierRef?.name || "",
      trackingNumber: shipment.trackingNumber || "",
      notes: shipment.notes || "",
    });
  }, [shipmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const events = useMemo<EventItem[]>(() => {
    if (!shipment) return [];
    const source = shipment.events || [];
    const items: EventItem[] = source.map((ev) => ({
      id: ev.id,
      icon: SHIPMENT_ICON[ev.status],
      tone: SHIPMENT_TONE[ev.status],
      title: ev.note || SHIPMENT_LABEL[ev.status] || ev.status,
      meta:
        ev.source === "API"
          ? "Actualizado por el courier"
          : ev.source === "WEBHOOK"
            ? "Webhook del courier"
            : "Registro manual",
      date: ev.occurredAt,
    }));

    if (items.length === 0) {
      items.push({
        id: `created-${shipment.id}`,
        icon: Package,
        tone: "neutral",
        title: "Envio registrado",
        meta: shipment.carrier || shipment.carrierRef?.name || "Sin transporte definido",
        date: shipment.createdAt,
      });
    }
    return items;
  }, [shipment]);

  if (!shipment) {
    return (
      <aside
        aria-label="Detalle del envio"
        className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          {loading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
          ) : (
            <Truck className="size-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Detalle del envio</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Selecciona un paquete para ver su transporte, la direccion de entrega y el historial de
            estados.
          </p>
        </div>
      </aside>
    );
  }

  const status = shipment.status;
  const canDispatch = TO_DISPATCH.includes(status);
  const canDeliver = IN_TRANSIT.includes(status);
  const recipientName = shipment.lead?.name || shipment.recipient?.name || "Clienta";
  const phone = shipment.lead?.phone || shipment.recipient?.phone || "";
  const tier = shipment.lead ? leadTier(shipment.lead) : undefined;
  const carrierOptions = carriers.length > 0 ? carriers.map((c) => c.name) : FALLBACK_CARRIERS;
  const StatusIcon = SHIPMENT_ICON[status];

  const copyTracking = async () => {
    const value = shipment.trackingNumber || folioOf(shipment);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard no disponible
    }
  };

  const saveEdit = () => {
    onUpdate(shipment.id, {
      carrier: draft.carrier,
      trackingNumber: draft.trackingNumber,
      notes: draft.notes,
    });
    setEditing(false);
  };

  return (
    <aside
      aria-label="Detalle del envio"
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)]"
    >
      <header className="relative shrink-0 overflow-hidden border-b border-border p-4">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transit/10 via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative flex items-start gap-3">
          <div
            aria-hidden
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full text-background",
              TOKEN_BG[SHIPMENT_TONE[status]]
            )}
          >
            <StatusIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                {folioOf(shipment)}
              </span>
              <Badge tone={SHIPMENT_TONE[status]}>{SHIPMENT_LABEL[status] || status}</Badge>
            </div>
            <h2 className="mt-1 truncate text-base font-semibold tracking-tight text-foreground">
              {recipientName}
            </h2>
            {phone && (
              <button
                type="button"
                onClick={copyTracking}
                className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-border bg-background/70 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition hover:text-foreground"
                aria-label="Copiar guia de seguimiento"
              >
                {shipment.trackingNumber || phone}
                {copied ? (
                  <Check className="size-3 text-success" aria-hidden />
                ) : (
                  <Copy className="size-3" aria-hidden />
                )}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="relative mt-3 grid grid-cols-3 gap-2">
          <Metric
            label="Costo"
            value={shipment.costClp ? money(shipment.costClp) : "—"}
            tone={shipment.costClp ? "text-foreground" : "text-muted-foreground/60"}
          />
          <Metric label="Peso" value={weightLabel(shipment.weightGrams)} />
          <Metric
            label="Intentos"
            value={String(shipment.attempts || 0)}
            tone={shipment.attempts ? "text-live" : "text-foreground"}
          />
        </div>
      </header>

      <div className="flex shrink-0 flex-col gap-2 border-b border-border p-4">
        <div className="grid grid-cols-2 gap-2">
          {canDispatch && (
            <Button
              size="sm"
              onClick={() => onUpdate(shipment.id, { status: "IN_TRANSIT" })}
              disabled={busy}
              className="w-full gap-1.5 text-xs font-semibold"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Send className="size-3.5" aria-hidden />
              )}
              Despachar
            </Button>
          )}
          {canDeliver && (
            <Button
              size="sm"
              variant="success"
              onClick={() => onUpdate(shipment.id, { status: "DELIVERED" })}
              disabled={busy}
              className="w-full gap-1.5 text-xs font-semibold"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="size-3.5" aria-hidden />
              )}
              Entregado
            </Button>
          )}
          <a
            href={phone ? waLink(phone) : "#"}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!phone}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-success text-xs font-semibold text-success-foreground transition-colors hover:bg-success/90",
              !phone && "pointer-events-none opacity-40"
            )}
          >
            <MessageCircle className="size-3.5" aria-hidden />
            WhatsApp
          </a>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPrint(shipment)}
            className="w-full gap-1.5 text-xs"
          >
            <Printer className="size-3.5" aria-hidden />
            Etiqueta
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing((v) => !v)}
            className="w-full gap-1.5 text-xs"
          >
            <Pencil className="size-3.5" aria-hidden />
            {editing ? "Cancelar" : "Editar"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scrollbar-thin p-4">
        <section>
          <SectionTitle>Transporte y guia</SectionTitle>
          {editing ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/60 p-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Transporte
                </span>
                <input
                  list="detail-carrier-options"
                  value={draft.carrier}
                  onChange={(e) => setDraft((d) => ({ ...d, carrier: e.target.value }))}
                  placeholder="Courier, flota propia o retiro..."
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <datalist id="detail-carrier-options">
                  {carrierOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Numero de guia
                </span>
                <input
                  value={draft.trackingNumber}
                  onChange={(e) => setDraft((d) => ({ ...d, trackingNumber: e.target.value }))}
                  placeholder="Guia de rastreo del courier"
                  className="h-8 rounded-md border border-input bg-background px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Notas de despacho
                </span>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  rows={2}
                  placeholder="Instrucciones para el repartidor, horarios, referencias..."
                  className="resize-none rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                  }}
                  className="h-7 px-2 text-[11px]"
                >
                  Cancelar
                </Button>
                <Button
                  size="xs"
                  onClick={saveEdit}
                  disabled={busy}
                  className="h-7 px-2.5 text-[11px] font-semibold"
                >
                  {busy ? <Loader2 className="size-3 animate-spin" aria-hidden /> : "Guardar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-background/60 p-3 text-xs">
              <div className="flex items-center gap-2">
                <Truck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <p className="font-medium text-foreground">
                  {shipment.carrier || shipment.carrierRef?.name || "Sin transporte definido"}
                </p>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {shipment.trackingNumber || "Sin guia asignada"}
              </p>
              {shipment.service && (
                <p className="mt-1 text-[11px] text-muted-foreground">{shipment.service}</p>
              )}
            </div>
          )}
        </section>

        <section>
          <SectionTitle>Direccion de entrega</SectionTitle>
          <div className="rounded-lg border border-border bg-background/60 p-3 text-xs">
            {shipment.lead?.addressStreet ? (
              <>
                <p className="font-medium text-foreground">
                  {shipment.lead.addressStreet} {shipment.lead.addressNumber}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {shipment.lead.addressColonia ? `Comuna ${shipment.lead.addressColonia}, ` : ""}
                  {shipment.lead.addressCity} {shipment.lead.addressState}
                  {shipment.lead.addressZipCode ? ` · ${shipment.lead.addressZipCode}` : ""}
                </p>
                {shipment.lead.addressNotes && (
                  <p className="mt-1.5 border-t border-border pt-1.5 text-[11px] italic text-muted-foreground">
                    Ref: {shipment.lead.addressNotes}
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden />
                <p className="text-[11px] italic">Sin direccion capturada aun.</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionTitle>Pedido</SectionTitle>
          <div className="rounded-lg border border-border bg-background/60 p-3 text-xs">
            <p className="font-medium text-foreground">
              {shipment.paymentOrder?.concept || "Prendas Live"}
            </p>
            {shipment.paymentOrder?.amount != null && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {money(Number(shipment.paymentOrder.amount))} ·{" "}
                {formatDate(shipment.paymentOrder.createdAt)}
              </p>
            )}
          </div>
        </section>

        <section>
          <SectionTitle>Historial de estados</SectionTitle>
          <ol className="flex flex-col gap-3">
            {events.map((it) => {
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
                    <p className={cn("truncate text-[11px]", toneText(it.tone))}>{it.meta}</p>
                  </div>
                  <time className="shrink-0 pt-0.5 text-[10px] text-muted-foreground">
                    {timeAgo(it.date)}
                  </time>
                </li>
              );
            })}
          </ol>
        </section>

        {shipment.notes && !editing && (
          <section>
            <SectionTitle className="text-pending">Notas de despacho</SectionTitle>
            <div className="rounded-lg border border-pending/20 bg-pending/5 p-3 text-[12px] leading-relaxed text-foreground">
              {shipment.notes}
            </div>
          </section>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-2.5">
        <span className="text-[10px] text-muted-foreground">
          Registrado {timeAgo(shipment.createdAt)}
        </span>
        {tier && <Avatar name={recipientName} tier={tier} size="sm" />}
      </div>
    </aside>
  );
}
