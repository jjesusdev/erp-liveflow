"use client";

import { cn } from "@/lib/utils";
import type { CustomerTier } from "@/lib/liveflow-data";
import type { Lead, PaymentStatus, ShipmentStatus } from "@/types";

type Tone = "neutral" | "live" | "success" | "pending" | "transit" | "vip";

export const PAYMENT_TONE: Record<PaymentStatus, Tone> = {
  PAID: "success",
  SENT: "transit",
  PENDING: "pending",
  EXPIRED: "neutral",
  CANCELLED: "live",
  REFUNDED: "pending",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PAID: "Pagado",
  SENT: "Por pagar",
  PENDING: "Pendiente",
  EXPIRED: "Vencido",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export const SHIPMENT_TONE: Record<ShipmentStatus, Tone> = {
  PENDING: "pending",
  READY: "pending",
  LABEL_PRINTED: "pending",
  PICKED_UP: "transit",
  IN_TRANSIT: "transit",
  OUT_FOR_DELIVERY: "transit",
  DELIVERED: "success",
  FAILED: "live",
  RETURNED: "pending",
  LOST: "live",
  CANCELLED: "neutral",
};

export const SHIPMENT_LABEL: Record<ShipmentStatus, string> = {
  PENDING: "Pendiente",
  READY: "Listo",
  LABEL_PRINTED: "Etiqueta",
  PICKED_UP: "Retirado",
  IN_TRANSIT: "En camino",
  OUT_FOR_DELIVERY: "En reparto",
  DELIVERED: "Entregado",
  FAILED: "Fallido",
  RETURNED: "Devuelto",
  LOST: "Perdido",
  CANCELLED: "Cancelado",
};

export const TOKEN_BG: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60",
  live: "bg-live",
  success: "bg-success",
  pending: "bg-pending",
  transit: "bg-transit",
  vip: "bg-vip",
};

export function initialsOf(name?: string | null, fallback = "?"): string {
  const base = (name || fallback).trim();
  if (!base) return fallback;
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function waLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

export function leadTier(lead: Lead): CustomerTier {
  return lead.tier === "VIP" ? "vip" : lead.tier === "FREQUENT" ? "recurrente" : "nueva";
}

export function leadAvgTicket(lead: Lead): number {
  const count = lead.totalPaidCount || 0;
  if (count <= 0) return 0;
  return (lead.totalSpent || 0) / count;
}

export function lastPaidAt(lead: Lead): string | null {
  if (lead.lastPaidAt) return lead.lastPaidAt;
  const paid = (lead.paymentOrders || []).filter((o) => o.status === "PAID");
  if (paid.length === 0) return null;
  return paid.reduce<string>((latest, o) => {
    const ts = o.paidAt || o.createdAt;
    return ts > latest ? ts : latest;
  }, paid[0].paidAt || paid[0].createdAt);
}

const RING: Record<CustomerTier, string> = {
  vip: "ring-vip/40 bg-vip/15 text-vip",
  recurrente: "ring-transit/35 bg-transit/12 text-transit",
  nueva: "ring-border bg-muted text-muted-foreground",
};

const AVATAR_SIZES = {
  sm: "size-8 text-[11px]",
  md: "size-10 text-xs",
  lg: "size-14 text-base",
};

export function Avatar({
  name,
  tier,
  size = "md",
  className,
}: {
  name?: string | null;
  tier?: CustomerTier;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold ring-1",
        AVATAR_SIZES[size],
        tier ? RING[tier] : "ring-border bg-muted text-muted-foreground",
        className
      )}
    >
      {initialsOf(name)}
    </div>
  );
}

export function Meter({
  value,
  tone = "success",
  className,
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="presentation"
    >
      <span
        className={cn("block h-full rounded-full transition-[width]", TOKEN_BG[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function CompositionBar({
  parts,
  className,
}: {
  parts: { value: number; tone: Tone; label: string }[];
  className?: string;
}) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  return (
    <div
      className={cn("flex h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="img"
      aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(", ")}
    >
      {parts.map((p) => (
        <span
          key={p.label}
          title={`${p.label}: ${p.value}`}
          className={cn("h-full", TOKEN_BG[p.tone])}
          style={{ width: total > 0 ? `${(p.value / total) * 100}%` : "0%" }}
        />
      ))}
    </div>
  );
}
