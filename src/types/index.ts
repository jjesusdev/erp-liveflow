export interface Lead {
  id: string;
  phone: string;
  name?: string | null;
  source?: string | null;
  internalNotes?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressColonia?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  addressNotes?: string | null;
  firstContactAt: string;
  lastInteractionAt?: string | null;
  lastPaidAt?: string | null;
  metadata?: any;
  tier?: "VIP" | "FREQUENT" | "NEW" | "GHOST";
  totalPaidCount?: number;
  totalSpent?: number;
  conversations?: Conversation[];
  paymentOrders?: PaymentOrder[];
  shipments?: Shipment[];
  campaignRecipients?: CampaignRecipient[];
}

export type ConversationStatus =
  "NEW" | "ATTENTION" | "AWAITING_PAYMENT" | "PAID" | "SHIPPED" | "CLOSED" | "LOST";

export interface Conversation {
  id: string;
  leadId: string;
  lead?: Lead | null;
  status: ConversationStatus;
  priority: number;
  assignedToId?: string | null;
  assignedTo?: Operator | null;
  lockedBy?: {
    socketId: string;
    operatorName: string;
    lockedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string | null;
  closedAt?: string | null;
  firstResponseAt?: string | null;
  responseTimeMs?: number | null;
  messages?: Message[];
  paymentOrders?: PaymentOrder[];
}

export type MessageType =
  "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "LOCATION" | "PAYMENT_LINK" | "SYSTEM";

export interface Message {
  id: string;
  conversationId: string;
  direction: "INBOUND" | "OUTBOUND";
  type: MessageType;
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  whatsappMsgId?: string | null;
  fromPhone?: string | null;
  sentAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  isTemplate: boolean;
  isPossibleReceipt?: boolean;
  pendingPaymentOrderId?: string | null;
}

export type PaymentStatus = "PENDING" | "SENT" | "PAID" | "EXPIRED" | "CANCELLED" | "REFUNDED";

export interface LiveSession {
  id: string;
  title: string;
  platform: string;
  status: "ACTIVE" | "ENDED";
  startedAt: string;
  endedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  paymentOrders?: PaymentOrder[];
  totalSales?: number;
  ordersCount?: number;
}

export interface PaymentOrder {
  id: string;
  conversationId: string;
  leadId: string;
  liveSessionId?: string | null;
  liveSession?: LiveSession | null;
  lead?: Lead | null;
  conversation?: Conversation | null;
  amount: number;
  currency: string;
  concept: string;
  status: PaymentStatus;
  provider?: "MERCADOPAGO" | "STRIPE" | "PAYPAL" | "CASH" | "TRANSFER" | null;
  providerLinkId?: string | null;
  providerLinkUrl?: string | null;
  createdById?: string | null;
  createdBy?: Operator | null;
  createdAt: string;
  sentAt?: string | null;
  paidAt?: string | null;
  expiresAt?: string | null;
  metadata?: any;
  shipment?: Shipment | null;
}

export type OperatorRole = "ADMIN" | "AGENT" | "VIEWER";

export interface Operator {
  id: string;
  name: string;
  email: string;
  role: OperatorRole;
  isActive: boolean;
  maxConversations: number;
  currentLoad: number;
  isOnline: boolean;
  lastSeenAt?: string | null;
  avatarUrl?: string | null;
}

export type ShipmentStatus =
  | "PENDING"
  | "READY"
  | "LABEL_PRINTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED"
  | "LOST"
  | "CANCELLED";

export type ShipmentMode = "COURIER" | "OWN_FLEET" | "PICKUP";
export type CarrierMode = "COURIER" | "EXTERNAL_OWN_FLEET" | "STORE_PICKUP";
export type CarrierApiProvider =
  | "MANUAL"
  | "CHILEXPRESS"
  | "BLUE"
  | "SHIPIT"
  | "ENVIAME"
  | "STARKEN"
  | "CORREOS"
  | "SIMPLIROUTE"
  | "BEETRACK";
export type ShipmentEventSource = "MANUAL" | "API" | "WEBHOOK";

export interface Carrier {
  id: string;
  orgId?: string | null;
  code: string;
  name: string;
  mode: CarrierMode;
  apiProvider: CarrierApiProvider;
  active: boolean;
  config?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  occurredAt: string;
  source: ShipmentEventSource;
  note?: string | null;
  payload?: unknown;
}

export interface ShipmentRecipient {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ShipmentAddress {
  street?: string | null;
  number?: string | null;
  commune?: string | null;
  region?: string | null;
  zip?: string | null;
}

export interface Shipment {
  id: string;
  paymentOrderId: string;
  paymentOrder?: PaymentOrder | null;
  leadId: string;
  lead?: Lead | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  mode?: ShipmentMode | null;
  carrierId?: string | null;
  carrierRef?: Carrier | null;
  service?: string | null;
  weightGrams?: number | null;
  dimensions?: unknown;
  costClp?: number | null;
  labelUrl?: string | null;
  trackingUrl?: string | null;
  providerRef?: string | null;
  recipient?: ShipmentRecipient | null;
  address?: ShipmentAddress | null;
  driverId?: string | null;
  attempts?: number;
  deliveredTo?: string | null;
  proofPhotoUrl?: string | null;
  status: ShipmentStatus;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  events?: ShipmentEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  imageUrl?: string | null;
  category?: string | null;
  stock: number;
  isActive: boolean;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "CANCELLED";

export interface Campaign {
  id: string;
  name: string;
  message: string;
  status: CampaignStatus;
  scheduledAt?: string | null;
  sentAt?: string | null;
  totalLeads: number;
  sentCount: number;
  failedCount: number;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  recipients?: CampaignRecipient[];
}

export type RecipientStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  leadId: string;
  lead?: Lead | null;
  status: RecipientStatus;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  shortcut?: string | null;
  variables: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessConfig {
  id: string;
  businessName: string;
  currency: string;
  timezone: string;
  bankName?: string | null;
  bankBeneficiary?: string | null;
  bankAccountNumber?: string | null;
  bankClabe?: string | null;
  bankNotes?: string | null;
  soundAlertsEnabled?: boolean;
  autoExpireOrders?: boolean;
  orderExpirationMinutes?: number;
  autoReleaseStock?: boolean;
  businessHoursStart?: string | null;
  businessHoursEnd?: string | null;
  autoReplyEnabled: boolean;
  autoReplyDelayMs: number;
  welcomeMessage: string;
  awayMessage?: string | null;
  queueMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
