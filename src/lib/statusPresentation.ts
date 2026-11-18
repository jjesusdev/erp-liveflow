import type { CampaignStatus, PaymentStatus, ShipmentStatus } from "@/types";

export type StatusTone = "neutral" | "live" | "success" | "pending" | "transit" | "vip";

export interface StatusPresentation {
  label: string;
  tone: StatusTone;
  /** Clases Tailwind para vistas que no usan el componente Badge (p. ej. campañas). */
  className?: string;
}

export type StatusDomain = "payment" | "shipment" | "conversation" | "campaign" | "caja";

export const PAYMENT_TONE: Record<PaymentStatus, StatusTone> = {
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

export const SHIPMENT_TONE: Record<ShipmentStatus, StatusTone> = {
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

const CAMPAIGN_TONE: Record<CampaignStatus, StatusTone> = {
  DRAFT: "neutral",
  SCHEDULED: "transit",
  SENDING: "pending",
  SENT: "success",
  CANCELLED: "live",
};

const CAMPAIGN_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  SENDING: "Enviando",
  SENT: "Enviada",
  CANCELLED: "Cancelada",
};

const CAMPAIGN_CLASS_NAME: Record<CampaignStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-blue-100 text-blue-800",
  SENDING: "bg-yellow-100 text-yellow-800",
  SENT: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

type PresentationMap = Record<string, StatusPresentation>;

function toPresentation(
  labels: Record<string, string>,
  tones: Record<string, StatusTone>,
  classNames?: Record<string, string>
): PresentationMap {
  return Object.fromEntries(
    Object.keys(labels).map((status) => [
      status,
      {
        label: labels[status],
        tone: tones[status] ?? "neutral",
        ...(classNames?.[status] ? { className: classNames[status] } : {}),
      },
    ])
  );
}

const STATUS_TABLE: Partial<Record<StatusDomain, PresentationMap>> = {
  payment: toPresentation(PAYMENT_LABEL, PAYMENT_TONE),
  shipment: toPresentation(SHIPMENT_LABEL, SHIPMENT_TONE),
  conversation: {
    NEW: { label: "Nuevo", tone: "live" },
    ATTENTION: { label: "En atención", tone: "transit" },
    AWAITING_PAYMENT: { label: "Esperando pago", tone: "pending" },
    PAID: { label: "Pagado", tone: "success" },
    SHIPPED: { label: "Despachado", tone: "transit" },
    CLOSED: { label: "Cerrado", tone: "neutral" },
    LOST: { label: "Perdido", tone: "live" },
  },
  campaign: toPresentation(CAMPAIGN_LABEL, CAMPAIGN_TONE, CAMPAIGN_CLASS_NAME),
  caja: {
    pagado: { label: "Pagado", tone: "success" },
    apartado: { label: "Apartado", tone: "pending" },
    vencido: { label: "Vencido", tone: "live" },
  },
};

/** Orden de resolución cuando el mismo código existe en varios dominios. */
const DEFAULT_LOOKUP_ORDER: StatusDomain[] = [
  "payment",
  "shipment",
  "conversation",
  "campaign",
  "caja",
];

/** Presentación única de estados; los desconocidos se devuelven tal cual con tono neutro. */
export function statusPresentation(status: string, domain?: StatusDomain): StatusPresentation {
  if (domain) {
    return STATUS_TABLE[domain]?.[status] ?? { label: status, tone: "neutral" };
  }
  for (const key of DEFAULT_LOOKUP_ORDER) {
    const entry = STATUS_TABLE[key]?.[status];
    if (entry) return entry;
  }
  return { label: status, tone: "neutral" };
}
