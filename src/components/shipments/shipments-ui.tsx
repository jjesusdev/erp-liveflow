"use client";

import {
  AlertOctagon,
  AlertTriangle,
  Bike,
  CheckCircle2,
  Clock,
  Package,
  PackageOpen,
  Printer,
  Truck,
  Undo2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Shipment, ShipmentStatus } from "@/types";

export function folioOf(shipment: Pick<Shipment, "id" | "paymentOrderId">): string {
  const seed = shipment.paymentOrderId || shipment.id;
  return `LF-${seed.slice(0, 8).toUpperCase()}`;
}

export function weightLabel(grams?: number | null): string {
  if (!grams || grams <= 0) return "—";
  if (grams < 1000) return `${grams} g`;
  return `${(grams / 1000).toFixed(2)} kg`;
}

export const SHIPMENT_ICON: Record<ShipmentStatus, LucideIcon> = {
  PENDING: Clock,
  READY: Package,
  LABEL_PRINTED: Printer,
  PICKED_UP: PackageOpen,
  IN_TRANSIT: Truck,
  OUT_FOR_DELIVERY: Bike,
  DELIVERED: CheckCircle2,
  FAILED: AlertTriangle,
  RETURNED: Undo2,
  LOST: AlertOctagon,
  CANCELLED: XCircle,
};

const TONE_TEXT: Record<string, string> = {
  neutral: "text-muted-foreground",
  live: "text-live",
  success: "text-success",
  pending: "text-pending",
  transit: "text-transit",
  vip: "text-vip",
};

export function toneText(tone: string): string {
  return TONE_TEXT[tone] || "text-foreground";
}
