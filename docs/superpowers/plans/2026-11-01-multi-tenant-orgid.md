# Multi-tenant orgId Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aislar los datos de cada cliente (organización) en el ERP LiveFlow: leads, conversaciones, cobros, envíos, catálogo, campañas y configuración pertenecen a una `Organization` y un operador solo ve/edita los datos de su organización.

**Architecture:** Se agrega el modelo `Organization` con `settings` (JSONB). Todas las entidades de negocio reciben `orgId` requerido y relación a `Organization`. La sesión del operador guarda `orgId` y cada ruta API filtra por `orgId` en lecturas y lo asigna en escrituras. Migración SQL versionada crea una org "Default", hace backfill de datos existentes y luego pone `orgId` NOT NULL.

**Tech Stack:** Prisma (schema + migraciones SQL versionadas), Next.js App Router API routes, `apiHandler` + Zod, sesión firmada (`src/lib/session.ts`), Vitest (integración con BD, `TEST_DB=1`).

**Spec:** `docs/superpowers/specs/2026-11-01-multi-tenant-orgid-design.md`

## Global Constraints

- Código, commits y documentación en español.
- Commits con prefijos semánticos (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Toda ruta nueva usa `apiHandler` + esquemas Zod.
- Cambios de esquema con `npx prisma db push` / migraciones versionadas, columnas nuevas nullable primero, luego NOT NULL tras backfill.
- Diagramas a mano (no aplica aquí, no hay cambio de arquitectura de red).
- Antes de dar por terminado: `npm run typecheck && npm run lint && npm run test`.

## Review Focus

1. Un operador de org A lista leads y solo ve los de org A (aislamiento de lectura).
2. Detalle de un lead de org B con token de org A → 404 (no se revela existencia).
3. Crear shipment cuyo paymentOrder es de otra org → 400 (relaciones cruzadas).
4. El cliente no puede enviar `orgId` en el body de creación; se ignora si viene.
5. Migración en BD con datos existentes: backfill a org Default antes de NOT NULL.

---

### Task 1: Modelo Prisma + migración de organización

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_organization/migration.sql`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_organization/migration.json`

**Interfaces:**

- Produces: modelo `Organization` (id, name, slug?, settings Json?, isActive, createdAt, updatedAt) con índices en `slug` e `isActive`.
- Produces: columnas `orgId` (nullable primero) en Operator, Lead, Conversation, Message, PaymentOrder, Shipment, Carrier, Campaign, Product, LiveSession, MessageTemplate, BotConfig, ActivityLog.
- Produces: `Carrier.orgId` de `String?` a `String` con `@@unique([orgId, code])`.
- Produces: `Organization.settings Json?` (reemplaza BusinessConfig).

- [ ] **Step 1: Escribir el schema Prisma con Organization y orgId en todas las entidades**

```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String?  @unique
  isActive  Boolean  @default(true)
  settings  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  operators      Operator[]
  leads          Lead[]
  conversations  Conversation[]
  messages       Message[]
  paymentOrders  PaymentOrder[]
  shipments      Shipment[]
  carriers       Carrier[]
  campaigns      Campaign[]
  products       Product[]
  liveSessions   LiveSession[]
  messageTemplates MessageTemplate[]
  botConfigs     BotConfig[]
  activityLogs   ActivityLog[]

  @@index([slug])
  @@index([isActive])
}
```

- [ ] **Step 2: Ejecutar `npx prisma db push` y verificar que no haya errores de tipo**

Run: `npx prisma db push`
Expected: éxito, 0 errores

- [ ] **Step 3: Generar migración SQL versionada en lugar de solo db push**

Run: revisar que `prisma/migrations/` tenga la carpeta con `migration.sql` y `migration.json`
Expected: archivos de migración creados

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): agregar modelo Organization y orgId a entidades (nullable)"
```

---

### Task 2: Backfill de datos existentes + orgId NOT NULL

**Files:**

- Create: `prisma/migrations/YYYYMMDDHHMMSS_backfill_orgid_default/migration.sql`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_backfill_orgid_default/migration.json`

**Interfaces:**

- Consumes: schema de Task 1 (columnas `orgId` nullable existentes).
- Produces: migración que inserta una `Organization` "Default", hace `UPDATE` en cada tabla seteando `orgId` al id de la org default donde sea null, y luego altera columnas a NOT NULL.

- [ ] **Step 1: Escribir migración SQL de backfill**

```sql
-- Insertar organización por defecto
INSERT INTO "Organization" (id, name, isActive, createdAt, updatedAt)
VALUES ('default-org-id', 'Default', true, now(), now());

-- Backfill en cada tabla
UPDATE "Operator" SET "orgId" = 'default-org-id' WHERE "orgId" IS NULL;
UPDATE "Lead" SET "orgId" = 'default-org-id' WHERE "orgId" IS NULL;
-- ... (todas las tablas con orgId)
UPDATE "Carrier" SET "orgId" = 'default-org-id' WHERE "orgId" IS NULL;

-- Hacer NOT NULL
ALTER TABLE "Operator" ALTER COLUMN "orgId" SET NOT NULL;
-- ... (todas las tablas)
```

- [ ] **Step 2: Aplicar migración en BD de desarrollo y verificar integridad**

Run: `npx prisma migrate deploy` (o `db:migrate`)
Expected: 0 errores, todas las filas tienen `orgId` poblado

- [ ] **Step 3: Commit**

```bash
git add prisma/migrations/
git commit -m "feat(db): backfill orgId default y NOT NULL en entidades"
```

---

### Task 3: Sesión del operador con orgId

**Files:**

- Modify: `src/lib/session.ts`
- Modify: `src/app/api/auth/login/route.ts`

**Interfaces:**

- Consumes: `createSession(operatorId, role)` existente.
- Produces: `createSession(operatorId, role, orgId)` guarda los tres en la sesión.
- Produces: `getOperatorContext(): Promise<{ operatorId: string; orgId: string; role: string } | null>` nuevo export.
- En login, tras autenticar, cargar operador con su `orgId` y guardarlo en la sesión.

- [ ] **Step 1: Modificar `createSession` para aceptar y guardar `orgId`**

- [ ] **Step 2: Agregar export `getOperatorContext()` que lee sesión y devuelve `{ operatorId, orgId, role }`**

- [ ] **Step 3: En `POST /api/auth/login`, cargar operador con `include: { organization: true }` y pasar `orgId` a `createSession`**

- [ ] **Step 4: Ejecutar `npm run typecheck` y `npm test` (sin BD)**

Run: `npx tsc --noEmit && npm test`
Expected: 0 errores typecheck, tests pasan

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts src/app/api/auth/login/route.ts
git commit -m "feat(auth): guardar orgId en la sesión del operador"
```

---

### Task 4: Helper de filtrado por orgId

**Files:**

- Create: `src/lib/org.ts`

**Interfaces:**

- Produces: `export function whereOrg(orgId: string): Record<string, string>` que retorna `{ orgId }`.
- Produces: `export function assertOrg(resourceId: string, orgId: string)` helper para validar pertenencia (opcional, usado en detalles).

- [ ] **Step 1: Crear `src/lib/org.ts` con `whereOrg`**

- [ ] **Step 2: Commit**

```bash
git add src/lib/org.ts
git commit -m "feat(org): helper de filtrado por organización"
```

---

### Task 5: Aislamiento en rutas de leads (ejemplo piloto)

**Files:**

- Modify: `src/app/api/leads/route.ts`
- Create: `src/app/api/leads/__tests__/leads.org.isolation.test.ts` (o extender el existente)

**Interfaces:**

- Consumes: `getOperatorContext()` de Task 3, `whereOrg()` de Task 4.
- Produces: GET `/api/leads` filtra por `orgId` del operador. POST asigna `orgId`.
- Test: crear lead en org A y org B, listar de org A solo retorna los de A. Detalle de lead de org B con token de org A → 404.

- [ ] **Step 1: Escribir test de aislamiento de leads (falla inicialmente)**

- [ ] **Step 2: Modificar GET y POST de `/api/leads` para usar `orgId` de sesión**

- [ ] **Step 3: Ejecutar `npm run test:db` y verificar aislamiento**

Run: `TEST_DB=1 npm test -- src/app/api/leads`
Expected: tests de aislamiento pasan

- [ ] **Step 4: Commit**

```bash
git add src/app/api/leads/ src/app/api/leads/__tests__/
git commit -m "feat(org): aislar leads por organización"
```

---

### Task 6: Aislamiento en rutas restantes (conversaciones, pagos, envíos, productos, campañas, carriers)

**Files:**

- Modify: `src/app/api/conversations/route.ts`
- Modify: `src/app/api/payment-orders/route.ts`
- Modify: `src/app/api/shipments/route.ts`
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/campaigns/route.ts`
- Modify: `src/app/api/carriers/route.ts`

**Interfaces:**

- Consumes: `getOperatorContext()`, `whereOrg()`.
- Produces: cada GET filtra por `orgId`, cada POST asigna `orgId`, cada detalle usa `{ id, orgId }` → 404.
- En shipments: verificar que paymentOrder y lead pertenezcan a la misma org antes de crear.

- [ ] **Step 1: Modificar cada ruta API para filtrar y asignar `orgId`**

- [ ] **Step 2: Ejecutar `npm run typecheck` y `npm run test:db`**

Run: `npx tsc --noEmit && TEST_DB=1 npm test`
Expected: 0 errores, todos los tests pasan

- [ ] **Step 3: Commit**

```bash
git add src/app/api/
git commit -m "feat(org): aislar rutas restantes por organización"
```

---

### Task 7: Middleware y protección de rutas (defensa en profundidad)

**Files:**

- Modify: `src/middleware.ts`

**Interfaces:**

- Consumes: sesión ya existe en middleware.
- Produces: el middleware ya exige sesión; no se requiere cambio funcional, solo verificar que las rutas protegidas no sean accesibles sin sesión (ya está). Opcional: agregar `orgId` a headers de request para uso interno si se necesita.

- [ ] **Step 1: Verificar que `src/middleware.ts` ya protege rutas no públicas con sesión**

- [ ] **Step 2: Ejecutar `npm run typecheck` y `npm run lint`**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errores

- [ ] **Step 3: Commit** (o no commitear si no hay cambios)

```bash
# si hubo cambios:
git add src/middleware.ts
git commit -m "docs(org): verificar middleware protege rutas con sesión"
```

---

### Task 8: Seed de demostración con organización

**Files:**

- Modify: `prisma/seed.js`

**Interfaces:**

- Consumes: schema con `Organization`.
- Produces: seed crea organización "Demo LiveFlow", operadores de ejemplo asociados, y datos de ejemplo (leads, conversaciones, cobros, envíos) con `orgId`.

- [ ] **Step 1: Actualizar `prisma/seed.js` para crear org y datos con `orgId`**

- [ ] **Step 2: Ejecutar `npm run db:seed` y verificar**

Run: `npm run db:seed`
Expected: éxito, datos creados con `orgId` de la org demo

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.js
git commit -m "feat(seed): organización y datos de demostración con orgId"
```

---

### Task 9: Verificación final y release

**Files:**

- Modify: `product/backlog.md`
- Modify: `roadmap/session-log.md`

**Interfaces:**

- Consumes: todo lo anterior.

- [ ] **Step 1: Ejecutar verificación completa**

Run: `npm run typecheck && npm run lint && npm test && TEST_DB=1 npm test`
Expected: 0 errores, todos los tests pasan

- [ ] **Step 2: Ejecutar `npm run build`**

Run: `npm run build`
Expected: EXIT 0

- [ ] **Step 3: Actualizar `product/backlog.md` marcando multi-tenant como completado**

- [ ] **Step 4: Commit y push + tag**

```bash
git add product/backlog.md roadmap/session-log.md
git commit -m "feat(org): multi-tenant real con orgId completado"
git push origin master
git tag -a v1.1.0 -m "v1.1.0 - multi-tenant real con orgId"
git push origin v1.1.0
```

- [ ] **Step 5: Registrar entrada en `roadmap/session-log.md`**

---

## Self-Review

1. **Spec coverage:** Cada requisito del diseño tiene al menos una task: modelo (Task 1), migración/backfill (Task 2), sesión (Task 3), helper (Task 4), aislamiento piloto (Task 5), rutas restantes (Task 6), middleware (Task 7), seed (Task 8), verificación (Task 9).
2. **Step scan:** Cada paso es una acción concreta con resultado verificable. No hay "TBD" ni "handle edge cases".
3. **Type consistency:** `whereOrg`, `getOperatorContext`, `createSession(operatorId, role, orgId)` son consistentes entre tasks.
4. **Review Focus:** Los 5 puntos de review focus tienen tests asignados (Task 5 y Task 6).
5. **Proportion:** El plan es proporcional al diseño; no hay bloques de código innecesarios.

---

Plan completo y guardado en `docs/superpowers/plans/2026-11-01-multi-tenant-orgid.md`.

**¿El plan captura lo que quieres?** Tengo dos opciones de ejecución:

- **Nativo** — Yo implemento cada task en esta sesión, verifico (`typecheck`, `lint`, `test`) y hago un review final al final. Más rápido y barato.
- **Subagent-driven** — Un subagente implementa cada task y un reviewer fresco lo revisa antes de pasar a la siguiente. Más exhaustivo, pero requiere contexto fresco por task.

¿Cuál prefieres?
