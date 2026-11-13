-- Migración: orgId opcional en entidades de negocio
--
-- El schema volvió a declarar `orgId` como nullable en las entidades de negocio
-- (la organización pasa a ser opcional). La migración previa
-- `20261101224000_backfill_orgid_default` las había dejado NOT NULL.
--
-- `Carrier.orgId` sigue siendo requerido: no se toca.

ALTER TABLE "Operator" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "Conversation" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "Message" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "PaymentOrder" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "LiveSession" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "MessageTemplate" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "BotConfig" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "ActivityLog" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "Shipment" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "Campaign" ALTER COLUMN "orgId" DROP NOT NULL;
