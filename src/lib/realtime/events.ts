import type { Server } from "socket.io";
import type { CampaignStatus, ConversationStatus, LiveSession, PaymentStatus } from "@/types";

/**
 * `server/index.ts` registra el servidor Socket.IO como `(globalThis as any).io`.
 * Declararlo una sola vez aquí permite leerlo sin `any` desde cualquier módulo.
 */
declare global {
  var io: Server | undefined;
}

/** Acceso tipado al servidor Socket.IO global; `null` si aún no se inicializó. */
export function getIO(): Server | null {
  return globalThis.io ?? null;
}

/**
 * Los emisores actuales mezclan entidades Prisma (fechas `Date`) con DTOs ya
 * serializados (fechas `string`). Exigir sólo los campos identificadores y
 * permitir campos extra evita casts mientras se migran los API routes.
 */
export interface RealtimeEventBase {
  [key: string]: unknown;
}

export interface PaymentUpdatedPayload extends RealtimeEventBase {
  id: string;
  status?: PaymentStatus;
  amount?: number;
}

export interface MessageNewPayload extends RealtimeEventBase {
  id: string;
  conversationId?: string;
}

export interface ConversationUpdatedPayload extends RealtimeEventBase {
  id: string;
  status?: ConversationStatus;
  lastMessageAt?: string | Date | null;
}

export interface CampaignUpdatedPayload extends RealtimeEventBase {
  id: string;
  status?: CampaignStatus;
}

export interface LiveSessionUpdatedPayload extends RealtimeEventBase {
  id: string;
  status?: LiveSession["status"];
}

export interface WhatsAppStatusPayload extends RealtimeEventBase {
  connected: boolean;
  connecting?: boolean;
  qr?: string | null;
  lastError?: string | null;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
}

export interface RealtimeEventPayloads {
  "payment:updated": PaymentUpdatedPayload;
  "message:new": MessageNewPayload;
  "conversation:updated": ConversationUpdatedPayload;
  "campaign:updated": CampaignUpdatedPayload;
  "live:session:updated": LiveSessionUpdatedPayload;
  "whatsapp:status": WhatsAppStatusPayload;
}

export type RealtimeEventName = keyof RealtimeEventPayloads;

/** Emisión genérica tipada; devuelve `false` cuando no hay servidor disponible. */
export function emitRealtime<K extends RealtimeEventName>(
  event: K,
  payload: RealtimeEventPayloads[K]
): boolean {
  return getIO()?.emit(event, payload) ?? false;
}

export function emitPaymentUpdated(payload: PaymentUpdatedPayload): boolean {
  return emitRealtime("payment:updated", payload);
}

export function emitMessageNew(payload: MessageNewPayload): boolean {
  return emitRealtime("message:new", payload);
}

export function emitConversationUpdated(payload: ConversationUpdatedPayload): boolean {
  return emitRealtime("conversation:updated", payload);
}

export function emitCampaignUpdated(payload: CampaignUpdatedPayload): boolean {
  return emitRealtime("campaign:updated", payload);
}

export function emitLiveSessionUpdated(payload: LiveSessionUpdatedPayload): boolean {
  return emitRealtime("live:session:updated", payload);
}

export function emitWhatsAppStatus(payload: WhatsAppStatusPayload): boolean {
  return emitRealtime("whatsapp:status", payload);
}
