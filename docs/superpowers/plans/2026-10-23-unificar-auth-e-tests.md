# Unificar Autenticación y Agregar Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

## Goal

Consolidar la implementación de autenticación de operadores eliminando la duplicidad entre `src/lib/auth.ts` y `src/lib/operator.ts`, y agregar tests unitarios para las funciones `hashPassword` y `comparePassword`. Además, actualizar `seed.js` para usar hashes reales en lugar de dummy.

## Architecture

El proyecto tiene actualmente **dos implementaciones** de `resolveOperatorId`:

1. `src/lib/auth.ts` - usa scrypt nativo Node 22 (correcto, usado por `/api/auth/login`)
2. `src/lib/operator.ts` - usa formato bcrypt dummy + lógica alternativa

El objetivo es **unificar** todas las referencias para que usen `auth.ts` proper, y asegurar que los tests cubran las funciones de hashing.

## Tech Stack

- Node.js 22 + TypeScript
- Prisma ORM + PostgreSQL
- vitest para tests
- crypto native scrypt

## Review Focus

1. **Hash format inconsistency**: `auth.ts` usa base64(salt+derivedKey), `operator.ts` espera bcrypt/argon2 format. Al unificar, asegurar que todo el sistema use el formato base64 de scrypt.
2. **Seed.js out-of-sync**: El seed crea operators con hash dummy `$2b$10$...`. Debe actualizarse para usar `hashPassword("admin123")` de auth.ts.
3. **Ruta API ya funciona**: `POST /api/auth/login` ya pasa tests (63/63), pero la lógica subyacente en `operator.ts` es inconsistente.

## Plan Document

### Task 1: Escribir tests para auth.ts (TDD)

**Files:**

- Create: `src/lib/__tests__/auth.test.ts`
- Modify: none (usar archivo nuevo)

**Interfaces:**

- Consume: ninguna (archivo nuevo)
- Produce: tests unitarios para `hashPassword` y `comparePassword`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "@/lib/auth";

describe("auth.ts hashPassword", () => {
  it("should generate a valid scrypt hash", async () => {
    const hash = await hashPassword("testpassword123");
    expect(typeof hash).toBe("string");
    expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/); // base64 pattern
    // Debe tener al menos 48 chars (16 salt + 32 key en base64)
    expect(hash.length).toBeGreaterThanOrEqual(48);
  });

  it("should produce different hashes for same password", async () => {
    const hash1 = await hashPassword("secret");
    const hash2 = await hashPassword("secret");
    expect(hash1).not.toBe(hash2); // diferente salt cada vez
  });
});

describe("auth.ts comparePassword", () => {
  it("should return true for correct password", async () => {
    const hash = await hashPassword("admin123");
    const result = await comparePassword("admin123", hash);
    expect(result).toBe(true);
  });

  it("should return false for wrong password", async () => {
    const hash = await hashPassword("admin123");
    const result = await comparePassword("wrongpassword", hash);
    expect(result).toBe(false);
  });

  it("should return false for empty password", async () => {
    const hash = await hashPassword("admin123");
    const result = await comparePassword("", hash);
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** (before implementing, but auth.ts already exists, so this will actually pass if we structure tests correctly)

Actually, since `auth.ts` already exists and works, the tests should **pass** immediately. But the point is to ensure test coverage.

- [ ] **Step 3: Implement** - No implementation needed, auth.ts already has the functions. Step is: verify tests pass.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/lib/__tests__/auth.test.ts`
Expected: PASS (63 existing tests + new 2-4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/__tests__/auth.test.ts
git commit -m "test: add unit tests for hashPassword and comparePassword"
```

### Task 2: Unificar resolveOperatorId para usar auth.ts

**Files:**

- Modify: `src/lib/operator.ts`
- Modify: `src/app/api/auth/login/route.ts` (opcional, ya usa auth.ts)

**Interfaces:**

- Consume: `hashPassword`, `comparePassword` from `src/lib/auth`
- Produce: `resolveOperatorId` consistente en todo el código

**Current state analysis:**

- `operator.ts` line 48: `passwordValid = password === "admin123"` (bcrypt dummy comparison)
- `operator.ts` line 27: `passwordHash: "$2b$10$dummyhashfortestingonly"` (formato bcrypt dummy)
- `auth.ts` lines 12-17: `hashPassword` retorna base64(salt+derivedKey)
- `auth.ts` lines 23-35: `comparePassword` verifica base64(salt+derivedKey)

**Approach:** Reemplazar la lógica en `operator.ts` para usar `auth.ts` functions.

- [ ] **Step 1: Update operator.ts to import and use auth.ts functions**

Replace the bcrypt/dummy comparison with auth.ts comparePassword:

```typescript
import { prisma } from "@/lib/prisma";
import {
  resolveOperatorId as resolveOperatorIdFromAuth,
  comparePassword,
  hashPassword,
} from "@/lib/auth";

// ... en la función resolveOperatorId:
if (!operatorId || !password) {
  // En lugar de crear hash dummy, usar el operador por defecto existente
  const existing = await prisma.operator.findUnique({
    where: { email: "admin@erp.local" },
    select: { id: true, name: true, role: true },
  });
  if (existing) return existing.id;

  // Crear con hash real usando auth.ts
  const created = await prisma.operator.create({
    data: {
      name: "Administrador",
      email: "admin@erp.local",
      passwordHash: await hashPassword("admin123"),
      role: "ADMIN" as const,
    },
    select: { id: true },
  });
  return created.id;
}

// Buscar operator por ID y verificar password usando auth.ts
const found = await prisma.operator.findUnique({
  where: { id: operatorId },
  select: { id: true, passwordHash: true },
});

if (found && (await comparePassword(password, found.passwordHash ?? ""))) {
  return found.id;
}

// Si no coincide, caer al default
const existing = await prisma.operator.findUnique({
  where: { email: "admin@erp.local" },
  select: { id: true },
});
if (existing) return existing.id;

// Crear si no existe
const created = await prisma.operator.create({
  data: {
    name: "Administrador",
    email: "admin@erp.local",
    passwordHash: await hashPassword("admin123"),
    role: "ADMIN" as const,
  },
  select: { id: true },
});
return created.id;
```

- [ ] **Step 2: Verify the change compiles**

Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 3: Run tests to verify auth still works**

Run: `npm run test`
Expected: 63+ tests passing

- [ ] **Step 4: Commit**

```bash
git add src/lib/operator.ts
git commit -m "feat: unify resolveOperatorId to use auth.ts scrypt hash"
```

### Task 3: Actualizar seed.js con hashes reales

**Files:**

- Modify: `prisma/seed.js`

**Interfaces:**

- Consume: `hashPassword` from `src/lib/auth`
- Produce: seed con passwords hasheados correctamente

**Current state:** `prisma/seed.js` line 27-28:

```javascript
passwordHash: "$2b$10$dummyhashfortestingonly",
```

**Approach:** Reemplazar con hash real usando auth.ts. Pero seed.js es JavaScript CommonJS, no TypeScript. Opciones:

Opción A: Importar auth.ts usando require con ESM interop (complicado)
Opción B: Ejecutar hashPassword manualmente y pegar el resultado
Opción C: Agregar una tarea de setup que use Node para generar el hash

Recomendado: **Opción C** - Agregar script Node al package.json o actualizar seed.js para que requiera el módulo.

Ejemplo de actualización en seed.js:

```javascript
const { hashPassword } = require("@/lib/auth"); // o la ruta correcta

// O usar Node directamente:
const crypto = require("crypto");

// Función scrypt manual en el seed
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 32);
  const combined = Buffer.concat([salt, derivedKey]);
  return combined.toString("base64");
}
```

- [ ] **Step 1: Update seed.js to use real hash**

Replace the dummy hash with a real scrypt hash generated by auth.ts or Node crypto.

- [ ] **Step 2: Run db:push and verify**

Run: `npm run db:push`
Expected: Schema pushes without errors, admin operator has valid hash

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.js
git commit -m "feat: update seed.js with real scrypt hashes"
```

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-23-unificar-auth-e-tests.md`. Please review the plan. Which execution approach would you prefer?

- **Subagent-driven** - Un subagent implementa cada tarea y un revisor fresco lo verifica antes de la siguiente, luego una revisión completa del branch al final. Más exhaustivo; cuesta un contexto fresco por tarea y por revisión.

- **Native** - Implemento cada tarea yo mismo en esta sesión, la forma en que este harness ejecuta trabajo, luego un revisor fresco en la modelo más capaz verifica todo el branch. Más barato y rápido; sin revisión independiente hasta el final. Funciona bien con un modelo de sesión de medio nivel, ya que el plan transporta el diseño.

**For this plan I recommend Native**, because:

1. Las tareas son secuenciales y dependen unas de otras (tests primero, luego refactor, luego seed)
2. Hay 63 tests existentes que no deben romperse
3. El código auth.ts ya está implementado y probado, solo hay que escribir tests y unificar
4. Es más seguro ejecutarlo todo en una sesión para evitar que los tests se modifiquen entre medio

¿Está de acuerdo con este plan y enfoque? Si sí, procederé con la ejecución nativa.
