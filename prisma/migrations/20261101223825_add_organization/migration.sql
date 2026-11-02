-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");

-- AlterTable Lead
ALTER TABLE "Lead" ADD COLUMN "orgId" TEXT;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Lead_orgId_idx" ON "Lead"("orgId");

-- AlterTable Conversation
ALTER TABLE "Conversation" ADD COLUMN "orgId" TEXT;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Conversation_orgId_idx" ON "Conversation"("orgId");

-- AlterTable Message
ALTER TABLE "Message" ADD COLUMN "orgId" TEXT;
ALTER TABLE "Message" ADD CONSTRAINT "Message_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Message_orgId_idx" ON "Message"("orgId");

-- AlterTable PaymentOrder
ALTER TABLE "PaymentOrder" ADD COLUMN "orgId" TEXT;
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "PaymentOrder_orgId_idx" ON "PaymentOrder"("orgId");

-- AlterTable LiveSession
ALTER TABLE "LiveSession" ADD COLUMN "orgId" TEXT;
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "LiveSession_orgId_idx" ON "LiveSession"("orgId");

-- AlterTable Operator
ALTER TABLE "Operator" ADD COLUMN "orgId" TEXT;
ALTER TABLE "Operator" ADD CONSTRAINT "Operator_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Operator_orgId_idx" ON "Operator"("orgId");

-- AlterTable MessageTemplate
ALTER TABLE "MessageTemplate" ADD COLUMN "orgId" TEXT;
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "MessageTemplate_orgId_idx" ON "MessageTemplate"("orgId");

-- AlterTable BotConfig
ALTER TABLE "BotConfig" ADD COLUMN "orgId" TEXT;
ALTER TABLE "BotConfig" ADD CONSTRAINT "BotConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "BotConfig_orgId_idx" ON "BotConfig"("orgId");

-- AlterTable ActivityLog
ALTER TABLE "ActivityLog" ADD COLUMN "orgId" TEXT;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ActivityLog_orgId_idx" ON "ActivityLog"("orgId");

-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN "orgId" TEXT;
ALTER TABLE "Product" ADD CONSTRAINT "Product_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Product_orgId_idx" ON "Product"("orgId");

-- AlterTable Carrier: orgId de nullable a requerido
ALTER TABLE "Carrier" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "Carrier" ADD CONSTRAINT "Carrier_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable Shipment
ALTER TABLE "Shipment" ADD COLUMN "orgId" TEXT;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Shipment_orgId_idx" ON "Shipment"("orgId");

-- AlterTable Campaign
ALTER TABLE "Campaign" ADD COLUMN "orgId" TEXT;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Campaign_orgId_idx" ON "Campaign"("orgId");

-- DropTable BusinessConfig
DROP TABLE "BusinessConfig";
