# Auth y Observabilidad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar autenticación end-to-end de operadores (login UI, sesión firmada, middleware, operatorId de auditoría) y observabilidad (health endpoint, logger estructurado, estado WhatsApp en UI).

**Architecture:**

- Auth: cookie de sesión httpOnly firmada (crypto scrypt existente), helper `getSession` que lee cookie, middleware Next.js que protege rutas excepto login/webhooks, `operatorId` tomado de sesión en API routes.
- Observabilidad: logger estructurado (`src/lib/logger.ts`) con nivel, requestId, operatorId; endpoint `GET /api/health` con estado de BD, WhatsApp, workers; UI que expone estado de WhatsApp.

**Tech Stack:** Next.js 15, cookies (next/headers), crypto (ya usado en auth.ts), Prisma, vitest.

**Spec:** roadmap/session-log.md pendientes #4 (Auth end-to-end) y #5 (Observabilidad + WhatsApp).

## Global Constraints

- Código, commits y documentación en español.
- No secrets en código — variables de entorno (.env).
- Tests de integración > unitarios; gated con TEST_DB=1.
- API: usar apiHandler + esquemas Zod.
- Middleware: proteger páginas y APIs excepto login y webhooks.
- typecheck, lint, test verdes antes de completar.

## Review Focus

- **Cookie de sesión sin firmar:** debe ser httpOnly, secure, sameSite=strict, con expiración.
- **Middleware omitiendo webhooks:** `/api/webhooks/*` y `/api/auth/login` no deben requerir sesión.
- **operatorId de auditoría:** debe leerse de la sesión, no del body (actividad.log).
- **Health endpoint sin fallar si WhatsApp está caído:** debe devolver estado degradado, no 500.
- **Login con credenciales inválidas:** debe retornar 401 sin revelar si el email existe.

---

### Task 1: Infraestructura de sesión (cookie firmada + getSession)

**Files:**

- Create: `src/lib/session.ts` — funciones `createSession`, `getSession`, `clearSession`, `verifySession`
- Modify: `src/app/api/auth/login/route.ts` — establecer cookie de sesión tras login exitoso
- Create: `src/app/api/auth/logout/route.ts` — limpiar cookie
- Test: `src/lib/session/__tests__/session.test.ts` (puro, sin BD)

**Interfaces:**

- Consumes: `comparePassword` de `@/lib/auth`, `prisma` de `@/lib/prisma`
- Produces: `createSession(operatorId) -> Response`, `getSession(req) -> { operatorId, role } | null`

- [ ] **Step 1: Implementar `src/lib/session.ts`** con `createSession`, `getSession`, `clearSession` usando `crypto` para firmar y `cookies()` de next/headers.
- [ ] **Step 2: Modificar `login/route.ts`** para llamar `createSession` y Set-Cookie tras autenticar.
- [ ] **Step 3: Crear `logout/route.ts`** que llame `clearSession`.
- [ ] **Step 4: typecheck + lint verdes.**
- [ ] **Step 5: Commit.**

### Task 2: Middleware de protección de rutas

**Files:**

- Create: `src/middleware.ts` — protege páginas y APIs excepto login, webhooks, static, providers
- Test: `src/middleware.test.ts` (integración con TEST_DB=1)

**Interfaces:**

- Consumes: `getSession` de `@/lib/session`
- Produces: redirect a `/login` si no hay sesión; next si autenticado o ruta excluida

- [ ] **Step 1: Implementar `src/middleware.ts`** con lista de rutas públicas (`/login`, `/api/auth/login`, `/api/webhooks/*`, `/api/health`, `_next`, static).
- [ ] **Step 2: Escribir test de integración** que verifique acceso denegado sin sesión y acceso permitido con sesión.
- [ ] **Step 3: TEST_DB=1 npm test + typecheck + lint verdes.**
- [ ] **Step 4: Commit.**

### Task 3: UI de login + uso de operatorId de sesión en API

**Files:**

- Create: `src/app/login/page.tsx` — pantalla de login con formulario email/password
- Create: `src/components/auth/LoginForm.tsx` — componente de formulario
- Modify: API routes existentes (leads, shipments, caja, conversations) para tomar `operatorId` de `getSession` en lugar de `resolveOperatorId`/body
- Test: `src/app/api/leads/__tests__/leads.integration.test.ts` — verificar operatorId en ActivityLog (opcional, ampliar)

**Interfaces:**

- Consumes: `getSession`, `createSession`
- Produces: UI login funcional; API routes usan `operatorId` de sesión

- [ ] **Step 1: Crear `src/app/login/page.tsx` y `LoginForm.tsx`.**
- [ ] **Step 2: Modificar al menos una API route crítica (ej. leads POST)** para usar `getSession` y registrar `operatorId` en ActivityLog.
- [ ] **Step 3: Test de login exitoso y fallido (401).**
- [ ] **Step 4: typecheck + lint + test verdes.**
- [ ] **Step 5: Commit.**

### Task 4: Logger estructurado

**Files:**

- Create: `src/lib/logger.ts` — `logger.info/warn/error` con nivel, requestId, operatorId, contexto
- Modify: `src/lib/api-handler.ts` — inyectar requestId y llamar logger en errores
- Test: `src/lib/logger/__tests__/logger.test.ts` (puro)

**Interfaces:**

- Consumes: nada externo (console bajo el capó)
- Produces: `logger.log(level, message, context)`

- [ ] **Step 1: Implementar `src/lib/logger.ts`** con formato JSON opcional, niveles, requestId desde headers o generado.
- [ ] **Step 2: Integrar en `apiHandler`** para loguear errores de API con requestId.
- [ ] **Step 3: typecheck + lint verdes.**
- [ ] **Step 4: Commit.**

### Task 5: Endpoint de salud `/api/health`

**Files:**

- Create: `src/app/api/health/route.ts` — `GET` que verifica BD, WhatsApp (global), workers (global)
- Test: `src/app/api/health/__tests__/health.integration.test.ts` (TEST_DB=1)

**Interfaces:**

- Consumes: `prisma`, `(global as any).whatsappClient`, `(global as any).io`
- Produces: JSON `{ status: "ok"|"degraded", dependencies: { db, whatsapp, workers } }`

- [ ] **Step 1: Implementar `GET /api/health`** que haga `prisma.$queryRaw\`SELECT 1\`` y chequee globales de WhatsApp/workers sin tirar si faltan.
- [ ] **Step 2: Test de integración con BD (TEST_DB=1).**
- [ ] **Step 3: typecheck + lint + test verdes.**
- [ ] **Step 4: Commit.**

### Task 6: Estado de WhatsApp en UI (config)

**Files:**

- Modify: `src/components/config/ConfigPage.tsx` — agregar pestaña "Estado WhatsApp" o sección
- Create: `src/components/config/WhatsAppStatusSection.tsx` — muestra conectado/QR/reconectando/desconectado
- Test: opcional (componente UI)

**Interfaces:**

- Consumes: `GET /api/health` o endpoint dedicado de WhatsApp status
- Produces: UI con indicador visual de estado de WhatsApp

- [ ] **Step 1: Crear `WhatsAppStatusSection.tsx`** que llame a `/api/health` y muestre badge de estado.
- [ ] **Step 2: Integrar en `ConfigPage.tsx`.**
- [ ] **Step 3: typecheck + lint verdes.**
- [ ] **Step 4: Commit.**
