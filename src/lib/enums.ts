import {
  ConversationStatus,
  PaymentStatus,
  PaymentProvider,
  ShipmentStatus,
  CampaignStatus,
  MessageType,
  Direction,
} from '@prisma/client';

export const CONVERSATION_STATUSES = Object.values(ConversationStatus);
export const PAYMENT_STATUSES = Object.values(PaymentStatus);
export const PAYMENT_PROVIDERS = Object.values(PaymentProvider);
export const SHIPMENT_STATUSES = Object.values(ShipmentStatus);
export const CAMPAIGN_STATUSES = Object.values(CampaignStatus);
export const MESSAGE_TYPES = Object.values(MessageType);
export const DIRECTIONS = Object.values(Direction);

export function parseEnum<T extends string>(
  allowed: readonly T[],
  value: unknown
): T | undefined {
  if (typeof value !== 'string') return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function isValidEnum<T extends string>(
  allowed: readonly T[],
  value: unknown
): value is T {
  return parseEnum(allowed, value) !== undefined;
}