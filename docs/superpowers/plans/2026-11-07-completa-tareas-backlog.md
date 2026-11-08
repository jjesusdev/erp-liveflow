# Completar Tareas del Backlog - ERP LiveFlow

**For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completar todas las tareas pendientes del backlog y agregar recordatorios automáticos de órdenes de pago pendientes.

**Architecture:** Trabajo de bajo nivel, implementando funcionalidad específica sin cambiar arquitectura. Usa patrones existentes de API handlers, schemas Zod, y workers.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, Zod, Jest/Vitest, Tailwind CSS

**Spec:** Basado en `product/backlog.md`, `docs/domain-model.md`, y `src/lib/schemas.ts`

## Global Constraints

- Código, commits y documentación en español.
- Todas las rutas API nuevas usan `apiHandler` + esquemas Zod.
- Tests de integración > unitarios.
- Paleta dark zinc + emerald en UI.
- No hardcodear datos; usar defaults en schema.
- Antes de dar por terminado: `npm run typecheck && npm run lint && npm run test`.

## Review Focus

- Los recordatorios deben enviarse correctamente al lead por WhatsApp.
- El filtro por orgId debe aplicarse en todos los endpoints.
- Los tiempos de recordatorio deben ser configurables por organización.
- Los recordatorios deben registrar actividad en audit log.
- El endpoint debe ser idempotente (no enviar duplicados).

---

## Tareas

### Task 1: Agregar configuración de recordatorios automáticos en BusinessConfig

**Archivos:**

- Modificar: `src/lib/schemas.ts`
- Modificar: `src/types/index.ts`
- Modificar: `src/app/api/config/route.ts` (GET por defecto)

**Interfaces:**

- Consumes: `BusinessConfigInput` de `schemas.ts`
- Produces: `reminderEnabled`, `reminderBeforeMinutes`, `reminderDays` en `BusinessConfig`

- [ ] **Step 1: Agregar schemas para recordatorios**

```typescript
// En src/lib/schemas.ts, dentro de businessConfigSchema
reminderEnabled: z.boolean().optional(),
reminderBeforeMinutes: z.number().int().min(5).max(1440).optional(),
reminderDays: z.number().int().min(1).max(30).optional(),
```

- [ ] **Step 2: Actualizar tipo BusinessConfig**

```typescript
// En src/types/index.ts, dentro de BusinessConfig
reminderEnabled?: boolean;
reminderBeforeMinutes?: number;
reminderDays?: number;
```

- [ ] **Step 3: Ejecutar typecheck y lint**

Run: `npm run typecheck && npm run lint`
Expected: Sin errores

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas.ts src/types/index.ts
git commit -m "feat(config): agregar configuracion de recordatorios de pagos"
```

---

### Task 2: Crear endpoint API para disparar recordatorios

**Archivos:**

- Crear: `src/app/api/caja/reminders/route.ts`
- Crear: `src/lib/reminderWorker.ts`
- Modificar: `src/lib/schemas.ts` (agregar reminderSendSchema)

**Interfaces:**

- Consumes: `reminderSendSchema` con filtros
- Produces: JSON con `sentCount`, `totalPending`, `details[]`

- [ ] **Step 1: Agregar schema para recordatorios**

```typescript
// En src/lib/schemas.ts
export const reminderSendSchema = z.object({
  reminderType: z.enum(["PENDING_ONLY", "EXPIRED_ONLY", "ALL_PRIOR"].optional()),
  customMessage: z.string().max(2000).nullable().optional(),
  dryRun: z.boolean().optional(),
});
```

- [ ] **Step 2: Crear reminderWorker.ts**

```typescript
// src/lib/reminderWorker.ts
import { prisma } from "./prisma";
import { logActivity } from "./audit";

export async function processPaymentReminders(
  reminderType: "PENDING_ONLY" | "EXPIRED_ONLY" | "ALL_PRIOR" = "PENDING_ONLY",
  customMessage?: string | null,
  dryRun: boolean = false
) {
  const org = await prisma.organization.findFirst();
  const config = (org?.settings as any) ?? {};

  if (!config.reminderEnabled) return { sentCount: 0, totalPending: 0, details: [] };

  // Lógica para buscar pedidos según tipo y enviar recordatorios
}
```

- [ ] **Step 3: Crear endpoint POST /api/caja/reminders**

Implementar endpoint usando `apiHandler` con el schema creado.

- [ ] **Step 4: Ejecutar typecheck y lint**

Run: `npm run typecheck && npm run lint`
Expected: Sin errores

- [ ] **Step 5: Commit**

```bash
git add src/lib/reminderWorker.ts src/app/api/caja/reminders/route.ts src/lib/schemas.ts
git commit -m "feat(alerts): endpoint y worker para recordatorios de pagos pendientes"
```

---

### Task 3: Crear UI para envío manual de recordatorios

**Archivos:**

- Crear: `src/components/caja/RemindersSection.tsx`
- Modificar: `src/app/api/caja/route.ts` (añadir helper para recordatorios)

**Interfaces:**

- Consumes: `BusinessConfig` con campos de reminder
- Produces: Muestra estado y permite envío manual

- [ ] **Step 1: Crear RemindersSection.tsx**

```tsx
"use client";
import { useState } from "react";
import { Bell, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/config/ToggleSwitch";
import { toast } from "sonner";

interface RemindersSectionProps {
  config: { reminderEnabled?: boolean; reminderBeforeMinutes?: number; reminderDays?: number };
  onChange: (config: any) => void;
}
```

Diseñar UI con toggle, inputs de minutos/días, y botón de envío.

- [ ] **Step 2: Ejecutar typecheck y lint**

Run: `npm run typecheck && npm run lint`
Expected: Sin errores

- [ ] **Step 3: Commit**

```bash
git add src/components/caja/RemindersSection.tsx
git commit -m "feat(ui): seccion de recordatorios en vista de caja"
```

---

### Task 4: Agregar recordatorios automáticos al worker de expiración

**Archivos:**

- Modificar: `src/lib/orderExpirationWorker.ts`
- Modificar: `server/index.ts` (scheduler de recordatorios)

**Interfaces:**

- Consumes: `Organization.settings` con configuración de recordatorios
- Produces: Envío de mensajes antes de la expiración

- [ ] **Step 1: Modificar processExpiredPaymentOrders**

Agregar lógica para enviar recordatorios antes de que expire, usando `reminderBeforeMinutes`.

- [ ] **Step 2: Agregar scheduler de recordatorios en server/index.ts**

Intervalo de verificación cada minuto para recordatorios.

- [ ] **Step 3: Ejecutar typecheck y lint**

Run: `npm run typecheck && npm run lint`
Expected: Sin errores

- [ ] **Step 4: Commit**

```bash
git add src/lib/orderExpirationWorker.ts server/index.ts
git commit -m "feat(workers): recordatorios automaticos antes de expirar ordenes"
```

---

### Task 5: Crear tests de integración para recordatorios

**Archivos:**

- Crear: `src/app/api/caja/reminders/__tests__/reminders.integration.test.ts`

**Interfaces:**

- Consumes: API endpoint de recordatorios
- Produces: Tests que verifican envío correcto sin WhatsApp client

- [ ] **Step 1: Crear tests de integración**

Escribir tests para:

- GET recordatorios pendientes
- POST envío manual con dryRun
- Validación de customMessage
- Response con estadísticas

- [ ] **Step 2: Ejecutar tests**

Run: `TEST_DB=1 npm test`
Expected: Nuevos tests pasan

- [ ] **Step 3: Commit**

```bash
git add src/app/api/caja/reminders/__tests__/reminders.integration.test.ts
git commit -m "test(alerts): tests de integracion para recordatorios de pagos"
```

---

### Task 6: Limpiar warnings de ESLint

**Archivos:**

- Modificar: Múltiples archivos con `any` y vars no usadas

**Interfaces:**

- Consumes: Warning report de ESLint
- Produces: 0 errores, warnings justificados o eliminados

- [ ] **Step 1: Ejecutar lint y obtener warnings**

Run: `npm run lint` → Ver lista de warnings

- [ ] **Step 2: Corregir warnings `no-explicit-any`**

Añadir `as any` solo donde sea necesario, o usar tipos específicos.

- [ ] **Step 3: Eliminar variables no usadas**

Borrar vars o usar `_` prefijo si son intencionales.

- [ ] **Step 4: Verificar**

Run: `npm run lint`
Expected: 0 errores

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: limpiar warnings de ESLint"
```

---

### Task 7: Documentar recordatorios automáticos

**Archivos:**

- Crear: `docs/recordatorios-pagos.md`

**Interfaces:**

- N/A (documentación)

- [ ] **Step 1: Crear documentacion**

Escribir documentación similar a `docs/webhooks-mercadopago.md` explicando:

- Configuración de recordatorios
- Cómo funciona el worker
- Variables de entorno si aplica
- Cómo probar manualmente

- [ ] **Step 2: Commit**

```bash
git add docs/recordatorios-pagos.md
git commit -m "docs: documentar recordatorios automáticos de pagos"
```

---

### Task 8: Verificar todo y crear tag v1.2.0

**Archivos:**

- Verificar: build, typecheck, tests

**Interfaces:**

- Consumes: Todo el código implementado
- Produces: Tag de versión estable

- [ ] **Step 1: Verificar build**

Run: `npm run build`
Expected: EXIT 0

- [ ] **Step 2: Verificar tests**

Run: `npm run test`
Expected: 0 errores

- [ ] [ ] **Step 3: Crear y push tag v1.2.0**

```bash
git tag v1.2.0
git push origin v1.2.0
```

- [ ] **Commit final de actualización del backlog**

```bash
git add product/backlog.md roadmap/session-log.md
git commit -m "docs: actualizar backlog con recordatorios completados, v1.2.0"
```

---

## Plan de Implementación Alternativo (para considerar)

### Enfoque Propuesto: Worker + API + UI

1. **Primera semana:** Tasks 1-3 (configuración y API básica)
2. **Segunda semana:** Tasks 4-5 (worker y tests)
3. **Tercera semana:** Tasks 6-8 (lint, docs, release)

Ventaja: Cada task es independiente y testeable.
Desventaja: Requiere PostgreSQL para tests completos.

---

## Resumen de Cambios

| Archivo                                    | Tipo      | Descripción                         |
| ------------------------------------------ | --------- | ----------------------------------- |
| `src/lib/schemas.ts`                       | Modificar | Agregar schemas de recordatorios    |
| `src/types/index.ts`                       | Modificar | Agregar tipos BusinessConfig        |
| `src/lib/reminderWorker.ts`                | Crear     | Worker para envío de recordatorios  |
| `src/app/api/caja/reminders/route.ts`      | Crear     | Endpoint API de recordatorios       |
| `src/components/caja/RemindersSection.tsx` | Crear     | UI de recordatorios                 |
| `src/lib/orderExpirationWorker.ts`         | Modificar | Lógica de recordatorios automáticos |
| `server/index.ts`                          | Modificar | Scheduler de recordatorios          |
| `docs/recordatorios-pagos.md`              | Crear     | Documentación                       |
| `product/backlog.md`                       | Modificar | Actualizar estado                   |
