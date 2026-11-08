-- Migración: backfill de orgId con organización Default y NOT NULL en entidades
--
-- Esta migración es resistente a inconsistencias de naming de columnas.
-- Si la tabla Organization fue creada con columnas en minúsculas (sin comillas dobles),
-- renombramos las columnas al nombre correcto que Prisma espera.
--

DO $$
DECLARE
    v_default_org_id TEXT;
    v_column_exists BOOLEAN;
    v_columns_to_add TEXT[] := ARRAY['isActive', 'createdAt', 'updatedAt', 'settings'];
    v_column_name TEXT;
    v_has_organization BOOLEAN;
    v_org_id_col TEXT;
    v_name_col TEXT;
    v_slug_col TEXT;
BEGIN
    -- Verificar si la tabla Organization existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'Organization' AND table_schema = 'public'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        -- La tabla no existe, crearla desde cero con todas las columnas correctas
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
        CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
        CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");
        SET v_has_organization = FALSE;
    ELSE
        -- La tabla existe - verificar si necesitamos renombrar columnas al nombre correcto
        
        -- Verificar columnas críticas que Prisma espera
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Organization' AND column_name = 'name'
        ) INTO v_column_exists;
        IF NOT v_column_exists THEN
            RAISE EXCEPTION 'La tabla Organization existe pero no tiene columna "name" requerida';
        END IF;
        
        -- Verificar si existe columna 'isactive' (sin mayúsculas) y renombrar a isActive
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Organization' AND column_name = 'isactive'
        ) INTO v_column_exists;
        IF v_column_exists THEN
            -- Verificar si isActive ya existe (no debería, pero por seguridad)
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'Organization' AND column_name = 'isActive'
            ) THEN
                EXECUTE 'ALTER TABLE "Organization" RENAME COLUMN isactive TO isActive';
                EXECUTE 'DROP INDEX IF EXISTS "Organization_isActive_idx"';
                EXECUTE 'CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive")';
            END IF;
        END IF;
        
        -- Verificar columnas faltantes y agregarlas
        FOREACH v_column_name IN ARRAY v_columns_to_add
        LOOP
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'Organization' 
                AND column_name = v_column_name
            ) INTO v_column_exists;
            
            IF NOT v_column_exists THEN
                IF v_column_name = 'isActive' THEN
                    ALTER TABLE "Organization" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
                    CREATE INDEX IF NOT EXISTS "Organization_isActive_idx" ON "Organization"("isActive");
                ELSIF v_column_name = 'createdAt' THEN
                    ALTER TABLE "Organization" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
                ELSIF v_column_name = 'updatedAt' THEN
                    ALTER TABLE "Organization" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
                ELSIF v_column_name = 'settings' THEN
                    ALTER TABLE "Organization" ADD COLUMN "settings" JSONB;
                END IF;
            END IF;
        END LOOP;
        
        -- Verificar si hay alguna organización existente
        SELECT EXISTS (SELECT 1 FROM "Organization" LIMIT 1) INTO v_has_organization;
    END IF;
    
    -- Insertar o obtener la organización por defecto
    IF NOT v_has_organization THEN
        INSERT INTO "Organization" ("id", "name", "slug", "isActive", "settings", "createdAt", "updatedAt")
        VALUES ('default-org-id', 'Default', NULL, true, NULL, now(), now())
        RETURNING id INTO v_default_org_id;
    ELSE
        SELECT id INTO v_default_org_id FROM "Organization" WHERE "name" = 'Default' LIMIT 1;
        IF v_default_org_id IS NULL THEN
            INSERT INTO "Organization" ("id", "name", "slug", "isActive", "settings", "createdAt", "updatedAt")
            VALUES ('default-org-id', 'Default', NULL, true, NULL, now(), now())
            RETURNING id INTO v_default_org_id;
        END IF;
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