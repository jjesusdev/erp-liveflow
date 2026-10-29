# Convenciones — ERP LiveFlow

> Reglas prácticas de código. Complementa `AGENTS.md`.

## Idioma

- Todo en **español**: nombres de variables, funciones, comentarios, commits, documentación.
- Excepción: identificadores técnicos del dominio en inglés cuando son estándar (`apiHandler`, `useLeads`, `ShipmentStatus`).

## TypeScript

- `strict` activado. Evitar `any`; si es inevitable, documentar por qué.
- Tipos compartidos en `src/types/index.ts`; enums en `src/lib/enums.ts`.
- No mutar props ni estado directamente; usar copias.

## API routes

Ubicación: `src/app/api/<recurso>/route.ts` (colección) y `src/app/api/<recurso>/[id]/route.ts` (detalle).

```ts
import { apiHandler, notFound } from "@/lib/api-handler";
import { leadCreateSchema } from "@/lib/schemas";

export const GET = async (req: NextRequest) => {
  /* listado paginado */
};

export const POST = (req: NextRequest) =>
  apiHandler({
    body: leadCreateSchema,
    handler: async (req, body) => {
      /* crear */
    },
  });
```

- **Siempre** validar body con Zod (`src/lib/schemas.ts`).
- Listados: paginación server-side (`page`, `pageSize`, `q`, filtros) y `export=1` para CSV.
- Detalle: incluir relaciones completas.
- Respuestas de error: `{ error, details? }` vía `apiHandler`/`notFound`/`unauthorized`.
- Rate limiting: `src/lib/rate-limit.ts`.

## Componentes React

- `"use client"` solo cuando hay interactividad/estado.
- Descomponer páginas grandes: `XPage.tsx` (contenedor) + componentes + `useX` hook. Ejemplos: `LeadsPage`, `ShipmentsPage`, `CajaPage`.
- Reutilizar `src/components/ui/*` antes de crear primitivas nuevas.
- Design system en `src/components/liveflow/*` para el workspace operativo.
- Nombres de componentes en PascalCase, archivos en kebab o Pascal según el módulo (seguir el patrón existente).

## Base de datos / Prisma

- Esquema en `prisma/schema.prisma`; sincronizar con `npx prisma db push`.
- Cambios no destructivos: columnas nuevas nullable; enums solo agregan valores.
- Usar transacciones (`prisma.$transaction`) cuando una operación toca varias tablas (p. ej. crear `Shipment` + `ShipmentEvent`).
- No hardcodear datos de negocio en queries.

## Tests

- `vitest` + `@testing-library/react`. Config en `vitest.config.ts`, setup en `src/__tests__/setup.ts`.
- Prioridad: **tests de integración** de rutas/servicios > tests unitarios de utilidades.
- `npm run test`: suite rápida sin base de datos. Los tests que tocan BD usan `describeDb` y se saltan.
- `npm run test:db`: corre también los tests de integración con BD (`TEST_DB=1`). Requiere Postgres levantado; en CI lo activa el workflow.
- Los tests que dependen de BD deben agruparse con `describeDb` (ver `leads.integration.test.ts`), nunca con `describe.skipIf(!dbAvailable)` — esa condición se evalúa antes de conectar y los salta siempre.

## Commits

- Español, prefijos: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- Un commit = un cambio coherente. No mezclar features no relacionadas.

## Estilo

- Prettier (`.prettierrc`) y ESLint (`eslint.config.mjs`).
- Formato de moneda/fechas centralizado en `src/lib/format.ts` y `src/lib/date-utils.ts`.

## Seguridad

- Secrets solo en variables de entorno.
- Validar siempre la entrada del cliente (Zod) y la del webhook (firma).
- Auditar acciones sensibles con `src/lib/audit.ts` + `ActivityLog`.
