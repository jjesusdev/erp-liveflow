-- Initial migration: Create all tables, enums, and relationships
-- This migration is designed to be non-destructive.
-- It can be run on a fresh database or applied to an existing database 
-- where the tables/enums don't already exist.

-- ============================================================
-- Enum types
-- ============================================================

-- ConversationStatus: NEW, ATTENTION, AWAITING_PAYMENT, PAID, SHIPPED, CLOSED, LOST
CREATE TYPE "ConversationStatus" AS ENUM (
  'NEW',
  'ATTENTION',
  'AWAITING_PAYMENT',
  'PAID',
  'SHIPPED',
  'CLOSED',
  'LOST'
);

-- Direction: INBOUND, OUTBOUND
CREATE TYPE "Direction" AS ENUM (
  'INBOUND',
  'OUTBOUND'
);

-- MessageType: TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT, LOCATION, PAYMENT_LINK, SYSTEM
CREATE TYPE "MessageType" AS ENUM (
  'TEXT',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'DOCUMENT',
  'LOCATION',
  'PAYMENT_LINK',
  'SYSTEM'
);

-- PaymentStatus: PENDING, SENT, PAID, EXPIRED, CANCELLED, REFUNDED
CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING',
  'SENT',
  'PAID',
  'EXPIRED',
  'CANCELLED',
  'REFUNDED'
);

-- PaymentProvider: MERCADOPAGO, STRIPE, PAYPAL, CASH, TRANSFER
CREATE TYPE "PaymentProvider" AS ENUM (
  'MERCADOPAGO',
  'STRIPE',
  'PAYPAL',
  'CASH',
  'TRANSFER'
);

-- OperatorRole: ADMIN, AGENT, VIEWER
CREATE TYPE "OperatorRole" AS ENUM (
  'ADMIN',
  'AGENT',
  'VIEWER'
);

-- ShipmentStatus: PENDING, READY, LABEL_PRINTED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED, RETURNED, LOST, CANCELLED
CREATE TYPE "ShipmentStatus" AS ENUM (
  'PENDING',
  'READY',
  'LABEL_PRINTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'RETURNED',
  'LOST',
  'CANCELLED'
);

-- ShipmentMode: COURIER, OWN_FLEET, PICKUP
CREATE TYPE "ShipmentMode" AS ENUM (
  'COURIER',
  'OWN_FLEET',
  'PICKUP'
);

-- EventSource: MANUAL, API, WEBHOOK
CREATE TYPE "EventSource" AS ENUM (
  'MANUAL',
  'API',
  'WEBHOOK'
);

-- CarrierMode: COURIER, EXTERNAL_OWN_FLEET, STORE_PICKUP
CREATE TYPE "CarrierMode" AS ENUM (
  'COURIER',
  'EXTERNAL_OWN_FLEET',
  'STORE_PICKUP'
);

-- CarrierApiProvider: MANUAL, CHILEXPRESS, BLUE, SHIPIT, ENVIAME, STARKEN, CORREOS, SIMPLIROUTE, BEETRACK
CREATE TYPE "CarrierApiProvider" AS ENUM (
  'MANUAL',
  'CHILEXPRESS',
  'BLUE',
  'SHIPIT',
  'ENVIAME',
  'STARKEN',
  'CORREOS',
  'SIMPLIROUTE',
  'BEETRACK'
);

-- RecipientStatus: PENDING, SENT, DELIVERED, READ, FAILED
CREATE TYPE "RecipientStatus" AS ENUM (
  'PENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED'
);

-- CampaignStatus: DRAFT, SCHEDULED, SENDING, SENT, CANCELLED
CREATE TYPE "CampaignStatus" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'SENDING',
  'SENT',
  'CANCELLED'
);

-- ============================================================
-- Tables
-- ============================================================

-- Table: Operator
CREATE TABLE "Operator" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "role" "OperatorRole" NOT NULL DEFAULT 'AGENT',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "maxConversations" INTEGER NOT NULL DEFAULT 10,
  "currentLoad" INTEGER NOT NULL DEFAULT 0,
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "lastSeenAt" TIMESTAMP WITH TIME ZONE,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- Table: Lead
CREATE TABLE "Lead" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "phone" TEXT NOT NULL,
  "name" TEXT,
  "source" TEXT,
  "internalNotes" TEXT,
  "addressStreet" TEXT,
  "addressNumber" TEXT,
  "addressColonia" TEXT,
  "addressCity" TEXT,
  "addressState" TEXT,
  "addressZipCode" TEXT,
  "addressNotes" TEXT,
  "firstContactAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "lastInteractionAt" TIMESTAMP WITH TIME ZONE,
  "metadata" JSONB,

  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Lead_phone_key" UNIQUE ("phone")
);

-- Table: Conversation
CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "leadId" TEXT NOT NULL,
  "status" "ConversationStatus" NOT NULL DEFAULT 'NEW',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "assignedToId" TEXT,
  "firstResponseAt" TIMESTAMP WITH TIME ZONE,
  "responseTimeMs" INTEGER,
  "closedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE,
  CONSTRAINT "Conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Operator" ("id") ON DELETE SET NULL
);

-- Table: Message
CREATE TABLE "Message" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "conversationId" TEXT NOT NULL,
  "direction" "Direction" NOT NULL,
  "type" "MessageType" NOT NULL DEFAULT 'TEXT',
  "content" TEXT,
  "mediaUrl" TEXT,
  "mediaType" TEXT,
  "whatsappMsgId" TEXT,
  "fromPhone" TEXT,
  "sentAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "deliveredAt" TIMESTAMP WITH TIME ZONE,
  "readAt" TIMESTAMP WITH TIME ZONE,
  "isTemplate" BOOLEAN NOT NULL DEFAULT false,
  "templateId" TEXT,

  CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE,
  CONSTRAINT "Message_whatsappMsgId_key" UNIQUE ("whatsappMsgId")
);

-- Table: PaymentOrder
CREATE TABLE "PaymentOrder" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "conversationId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "liveSessionId" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MXN',
  "concept" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "provider" "PaymentProvider",
  "providerLinkId" TEXT,
  "providerLinkUrl" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "sentAt" TIMESTAMP WITH TIME ZONE,
  "paidAt" TIMESTAMP WITH TIME ZONE,
  "expiresAt" TIMESTAMP WITH TIME ZONE,

  CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentOrder_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentOrder_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentOrder_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession" ("id") ON DELETE SET NULL,
  CONSTRAINT "PaymentOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Operator" ("id") ON DELETE SET NULL
);

-- Table: LiveSession
CREATE TABLE "LiveSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'TIKTOK',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "endedAt" TIMESTAMP WITH TIME ZONE,
  "notes" TEXT,

  CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- Table: Shipment
CREATE TABLE "Shipment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "paymentOrderId" TEXT NOT NULL UNIQUE,
  "leadId" TEXT NOT NULL,
  "trackingNumber" TEXT,
  "carrier" TEXT,
  "mode" "ShipmentMode",
  "carrierId" TEXT,
  "carrierRef" TEXT,
  "service" TEXT,
  "weightGrams" INTEGER,
  "dimensions" JSONB,
  "costClp" INTEGER,
  "labelUrl" TEXT,
  "trackingUrl" TEXT,
  "providerRef" TEXT,
  "recipient" JSONB,
  "address" JSONB,
  "driverId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "deliveredTo" TEXT,
  "proofPhotoUrl" TEXT,
  "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
  "shippedAt" TIMESTAMP WITH TIME ZONE,
  "deliveredAt" TIMESTAMP WITH TIME ZONE,
  "notes" TEXT,

  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Shipment_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder" ("id") ON DELETE CASCADE,
  CONSTRAINT "Shipment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE,
  CONSTRAINT "Shipment_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE SET NULL
);

-- Table: ShipmentEvent
CREATE TABLE "ShipmentEvent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "shipmentId" TEXT NOT NULL,
  "status" "ShipmentStatus" NOT NULL,
  "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "source" "EventSource" NOT NULL DEFAULT 'MANUAL',
  "note" TEXT,
  "payload" JSONB,

  CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE CASCADE,
  CONSTRAINT "ShipmentEvent_shipmentId_status_idx" INDEX USING btree ("shipmentId", "status")
);

-- Table: Campaign
CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" TIMESTAMP WITH TIME ZONE,
  "sentAt" TIMESTAMP WITH TIME ZONE,
  "totalLeads" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Operator" ("id") ON DELETE SET NULL
);

-- Table: CampaignRecipient
CREATE TABLE "CampaignRecipient" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "campaignId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "status" "RecipientStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP WITH TIME ZONE,
  "deliveredAt" TIMESTAMP WITH TIME ZONE,
  "readAt" TIMESTAMP WITH TIME ZONE,
  "errorMessage" TEXT,

  CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE,
  CONSTRAINT "CampaignRecipient_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE
);

-- Table: BusinessConfig
CREATE TABLE "BusinessConfig" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "businessName" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MXN',
  "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
  "bankName" TEXT,
  "bankBeneficiary" TEXT,
  "bankAccountNumber" TEXT,
  "bankClabe" TEXT,
  "bankNotes" TEXT,
  "soundAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "autoExpireOrders" BOOLEAN NOT NULL DEFAULT true,
  "orderExpirationMinutes" INTEGER NOT NULL DEFAULT 30,
  "autoReleaseStock" BOOLEAN NOT NULL DEFAULT true,
  "businessHoursStart" TEXT,
  "businessHoursEnd" TEXT,
  "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT true,
  "autoReplyDelayMs" INTEGER NOT NULL DEFAULT 1000,
  "welcomeMessage" TEXT NOT NULL,
  "awayMessage" TEXT,
  "queueMessage" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT "BusinessConfig_pkey" PRIMARY KEY ("id")
);

-- Table: ActivityLog
CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "operatorId" TEXT,
  "conversationId" TEXT,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ActivityLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator" ("id") ON DELETE SET NULL,
  CONSTRAINT "ActivityLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX "Lead_lastInteractionAt_idx" ON "Lead" ("lastInteractionAt");
CREATE INDEX "Conversation_status_idx" ON "Conversation" ("status");
CREATE INDEX "Conversation_assignedToId_idx" ON "Conversation" ("assignedToId");
CREATE INDEX "Conversation_leadId_idx" ON "Conversation" ("leadId");
CREATE INDEX "Message_conversationId_idx" ON "Message" ("conversationId");
CREATE INDEX "Message_sentAt_idx" ON "Message" ("sentAt");
CREATE INDEX "PaymentOrder_status_idx" ON "PaymentOrder" ("status");
CREATE INDEX "PaymentOrder_leadId_idx" ON "PaymentOrder" ("leadId");
CREATE INDEX "PaymentOrder_conversationId_idx" ON "PaymentOrder" ("conversationId");
CREATE INDEX "LiveSession_status_idx" ON "LiveSession" ("status");
CREATE INDEX "Shipment_status_idx" ON "Shipment" ("status");
CREATE INDEX "Shipment_mode_idx" ON "Shipment" ("mode");
CREATE INDEX "Shipment_leadId_idx" ON "Shipment" ("leadId");
CREATE INDEX "Shipment_paymentOrderId_idx" ON "Shipment" ("paymentOrderId");
CREATE INDEX "ShipmentEvent_shipmentId_idx" ON "ShipmentEvent" ("shipmentId");
CREATE INDEX "ShipmentEvent_occurredAt_idx" ON "ShipmentEvent" ("occurredAt");
CREATE INDEX "Campaign_status_idx" ON "Campaign" ("status");
CREATE INDEX "Campaign_scheduledAt_idx" ON "Campaign" ("scheduledAt");
CREATE INDEX "CampaignRecipient_campaignId_idx" ON "CampaignRecipient" ("campaignId");
CREATE INDEX "CampaignRecipient_leadId_idx" ON "CampaignRecipient" ("leadId");
CREATE INDEX "BusinessConfig_currency_idx" ON "BusinessConfig" ("currency");
CREATE INDEX "ActivityLog_operatorId_idx" ON "ActivityLog" ("operatorId");
CREATE INDEX "ActivityLog_conversationId_idx" ON "ActivityLog" ("conversationId");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog" ("createdAt");

-- ============================================================
-- Default data for enums (if needed)
-- ============================================================

-- No default enum values needed; apps should insert their own data.

COMMENT ON TABLE "Operator" IS 'Operador del sistema, maneja conversaciones y pagos';
COMMENT ON TABLE "Lead" IS 'Cliente potencial, identificadopor número de teléfono';
COMMENT ON TABLE "Conversation" IS 'Conversación activa con un lead';
COMMENT ON TABLE "Message" IS 'Mensaje entrante/saliente en una conversación';
COMMENT ON TABLE "PaymentOrder" IS 'Orden de cobro asociada a una conversación';
COMMENT ON TABLE "LiveSession" IS 'Sesión de live streaming (TikTok/IG/YouTube)';
COMMENT ON TABLE "Shipment" IS 'Envío/pedido de un pago aprobado';
COMMENT ON TABLE "ShipmentEvent" IS 'Historial de eventos del envío';
COMMENT ON TABLE "Campaign" IS 'Campaña de marketing/envío masivo';
COMMENT ON TABLE "CampaignRecipient" IS 'Receptor de una campaña (lead específico)';
COMMENT ON TABLE "BusinessConfig" IS 'Configuración general del negocio (horarios, bancos, expiración)';
COMMENT ON TABLE "ActivityLog" IS 'Auditoría de acciones de operadores';