-- Migración: backfill de orgId con organización Default y NOT NULL en entidades
--
-- 1. Inserta la organización "Default" (slug null, isActive true, settings null)
--    solo si no existe ya una con ese nombre (idempotente).
-- 2. Asigna el id de la org Default a todas las filas existentes con orgId NULL
--    en cada tabla que tenga la columna (incluida Carrier por seguridad).
-- 3. Altera las columnas orgId a NOT NULL en todas las tablas donde aún son
--    nullable. Carrier.orgId ya es NOT NULL (Task 1), pero se reafirma.

DO $$
DECLARE
    v_default_org_id TEXT;
BEGIN
    -- Organización por defecto (id determinista para previsibilidad)
    SELECT id INTO v_default_org_id FROM "Organization" WHERE name = 'Default' LIMIT 1;
    IF v_default_org_id IS NULL THEN
        INSERT INTO "Organization" (id, name, slug, isActive, settings, createdAt, updatedAt)
        VALUES ('default-org-id', 'Default', NULL, true, NULL, now(), now())
        RETURNING id INTO v_default_org_id;
    END IF;

    -- Backfill en cada tabla con orgId nullable
    UPDATE "Operator" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;
    UPDATE "Lead" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;
    UPDATE "Conversation" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;
    UPDATE "Message" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;
    UPDATE "PaymentOrder" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;
    UPDATE "LiveSession" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;
    UPDATE "MessageTemplate" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;
    UPDATE "BotConfig" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;
    UPDATE "ActivityLog" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;
    UPDATE "Product" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;
    UPDATE "Shipment" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;
    UPDATE "Campaign" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;
    -- Carrier.orgId ya es NOT NULL, pero se cubre el backfill por seguridad
    UPDATE "Carrier" SET "orgId" = v_default_org_id WHERE "orgId" IS NULL;

    -- Columnas orgId a NOT NULL (todas las entidades de negocio)
    ALTER TABLE "Operator" ALTER COLUMN "orgId" SET NOT NULL;
    ALTER TABLE "Lead" ALTER COLUMN "orgId" SET NOT NULL;
    ALTER TABLE "Conversation" ALTER COLUMN "orgId" SET NOT NULL;
    ALTER TABLE "Message" ALTER COLUMN "orgId" SET NOT NULL;
    ALTER TABLE "PaymentOrder" ALTER COLUMN "orgId" SET NOT NULL;
    ALTER TABLE "LiveSession" ALTER COLUMN "orgId" SET NOT NULL;
    ALTER TABLE "MessageTemplate" ALTER COLUMN "orgId" SET NOT NULL;
    ALTER TABLE "BotConfig" ALTER COLUMN "orgId" SET NOT NULL;
    ALTER TABLE "ActivityLog" ALTER COLUMN "orgId" SET NOT NULL;
    ALTER TABLE "Product" ALTER COLUMN "orgId" SET NOT NULL;
    ALTER TABLE "Shipment" ALTER COLUMN "orgId" SET NOT NULL;
    ALTER TABLE "Campaign" ALTER COLUMN "orgId" SET NOT NULL;
    -- Carrier.orgId ya es NOT NULL (Task 1); se reafirma sin riesgo
    ALTER TABLE "Carrier" ALTER COLUMN "orgId" SET NOT NULL;
END $$;
