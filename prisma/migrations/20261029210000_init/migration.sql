-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('NEW', 'ATTENTION', 'AWAITING_PAYMENT', 'PAID', 'SHIPPED', 'CLOSED', 'LOST');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'PAYMENT_LINK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SENT', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MERCADOPAGO', 'STRIPE', 'PAYPAL', 'CASH', 'TRANSFER');

-- CreateEnum
CREATE TYPE "OperatorRole" AS ENUM ('ADMIN', 'AGENT', 'VIEWER');

-- CreateEnum
CREATE TYPE "CarrierMode" AS ENUM ('COURIER', 'EXTERNAL_OWN_FLEET', 'STORE_PICKUP');

-- CreateEnum
CREATE TYPE "CarrierApiProvider" AS ENUM ('MANUAL', 'CHILEXPRESS', 'BLUE', 'SHIPIT', 'ENVIAME', 'STARKEN', 'CORREOS', 'SIMPLIROUTE', 'BEETRACK');

-- CreateEnum
CREATE TYPE "ShipmentMode" AS ENUM ('COURIER', 'OWN_FLEET', 'PICKUP');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('MANUAL', 'API', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'READY', 'LABEL_PRINTED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecipientStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
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
    "firstContactAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastInteractionAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'NEW',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "responseTimeMs" INTEGER,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "whatsappMsgId" TEXT,
    "fromPhone" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'TIKTOK',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "OperatorRole" NOT NULL DEFAULT 'AGENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxConversations" INTEGER NOT NULL DEFAULT 10,
    "currentLoad" INTEGER NOT NULL DEFAULT 0,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "shortcut" TEXT,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "welcomeMessage" TEXT NOT NULL,
    "awayMessage" TEXT,
    "queueMessage" TEXT,
    "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoReplyDelayMs" INTEGER NOT NULL DEFAULT 1000,
    "businessHoursStart" TEXT,
    "businessHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT,
    "conversationId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "imageUrl" TEXT,
    "category" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrier" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "CarrierMode" NOT NULL,
    "apiProvider" "CarrierApiProvider" NOT NULL DEFAULT 'MANUAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "carrier" TEXT,
    "mode" "ShipmentMode",
    "carrierId" TEXT,
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
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "EventSource" NOT NULL DEFAULT 'MANUAL',
    "note" TEXT,
    "payload" JSONB,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "RecipientStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessConfig" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_phone_key" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_lastInteractionAt_idx" ON "Lead"("lastInteractionAt");

-- CreateIndex
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");

-- CreateIndex
CREATE INDEX "Conversation_assignedToId_idx" ON "Conversation"("assignedToId");

-- CreateIndex
CREATE INDEX "Conversation_leadId_idx" ON "Conversation"("leadId");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_whatsappMsgId_idx" ON "Message"("whatsappMsgId");

-- CreateIndex
CREATE INDEX "Message_sentAt_idx" ON "Message"("sentAt");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_idx" ON "PaymentOrder"("status");

-- CreateIndex
CREATE INDEX "PaymentOrder_conversationId_idx" ON "PaymentOrder"("conversationId");

-- CreateIndex
CREATE INDEX "PaymentOrder_leadId_idx" ON "PaymentOrder"("leadId");

-- CreateIndex
CREATE INDEX "PaymentOrder_liveSessionId_idx" ON "PaymentOrder"("liveSessionId");

-- CreateIndex
CREATE INDEX "PaymentOrder_createdById_idx" ON "PaymentOrder"("createdById");

-- CreateIndex
CREATE INDEX "PaymentOrder_paidAt_idx" ON "PaymentOrder"("paidAt");

-- CreateIndex
CREATE INDEX "LiveSession_status_idx" ON "LiveSession"("status");

-- CreateIndex
CREATE INDEX "LiveSession_startedAt_idx" ON "LiveSession"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_email_key" ON "Operator"("email");

-- CreateIndex
CREATE INDEX "Operator_isOnline_idx" ON "Operator"("isOnline");

-- CreateIndex
CREATE INDEX "Operator_role_idx" ON "Operator"("role");

-- CreateIndex
CREATE INDEX "ActivityLog_conversationId_idx" ON "ActivityLog"("conversationId");

-- CreateIndex
CREATE INDEX "ActivityLog_operatorId_idx" ON "ActivityLog"("operatorId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_isAvailable_idx" ON "Product"("isAvailable");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Carrier_active_idx" ON "Carrier"("active");

-- CreateIndex
CREATE INDEX "Carrier_mode_idx" ON "Carrier"("mode");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_orgId_code_key" ON "Carrier"("orgId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_paymentOrderId_key" ON "Shipment"("paymentOrderId");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_leadId_idx" ON "Shipment"("leadId");

-- CreateIndex
CREATE INDEX "Shipment_paymentOrderId_idx" ON "Shipment"("paymentOrderId");

-- CreateIndex
CREATE INDEX "Shipment_mode_idx" ON "Shipment"("mode");

-- CreateIndex
CREATE INDEX "Shipment_carrierId_idx" ON "Shipment"("carrierId");

-- CreateIndex
CREATE INDEX "ShipmentEvent_shipmentId_idx" ON "ShipmentEvent"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentEvent_occurredAt_idx" ON "ShipmentEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_scheduledAt_idx" ON "Campaign"("scheduledAt");

-- CreateIndex
CREATE INDEX "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_leadId_idx" ON "CampaignRecipient"("leadId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_status_idx" ON "CampaignRecipient"("status");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

