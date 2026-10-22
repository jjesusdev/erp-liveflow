---
name: ERP Feature Dev
description: Flujo para construir una feature o módulo nuevo en ERP LiveFlow (Next.js 15 + Prisma + Socket.io + Baileys). Usar cuando el usuario pide una feature, un módulo o un cambio funcional.
---

# ERP Feature Dev

Flujo de trabajo para features en **ERP LiveFlow**. Respeta las convenciones del proyecto (español, `apiHandler` + Zod, UI dark zinc + emerald).

## 1. Contexto

Leer antes de tocar código:

- `AGENTS.md` (reglas y punteros)
- `roadmap/session-log.md` (qué se hizo y decidió)
- `docs/architecture.md` y `docs/domain-model.md` (según el alcance)
- `docs/conventions.md` (reglas de código/API)

## 2. Diseño

- Usar la skill `brainstorming` antes de construir.
- Si es multi-paso, usar `writing-plans` y dejar la spec en `docs/<feature>-plan.md`.
- Definir el modelo de datos antes de la UI.

## 3. Datos (si aplica)

- Cargar `supabase-postgres-best-practices` + `prisma-client-api`.
- Editar `prisma/schema.prisma`; sincronizar con `npx prisma db push`.
- Cambios no destructivos: columnas nuevas nullable; enums solo agregan valores.
- Transacciones cuando una operación toca varias tablas.

## 4. Backend

- Ruta en `src/app/api/<recurso>/route.ts` (y `/[id]/route.ts` para detalle).
- **Siempre** `apiHandler` + esquema Zod de `src/lib/schemas.ts`.
- Listados paginados server-side (patrón de `/api/leads`).
- Auditar acciones sensibles con `src/lib/audit.ts`.

## 5. Frontend

- Cargar `frontend-design` y `web-design-guidelines` para UI.
- Cargar `vercel-react-best-practices` / `vercel-composition-patterns` si hay performance/composición.
- Descomponer la página: `XPage.tsx` + componentes + hook `useX`.
- Reutilizar `src/components/ui/*` y `src/components/liveflow/*`.

## 6. Verificar (obligatorio antes de terminar)

```bash
npm run typecheck && npm run lint && npm run test
```

Si el cambio es grande, correr `npm run build`. No afirmar que algo funciona sin correr los comandos.

## 7. Review y documentación

- `code-review` para cambios grandes; `requesting-code-review` antes de cerrar.
- Documentar en `docs/`, `product/`, el vault de Obsidian (`C:\Users\User\Documents\erp-vault`) y cerrar con `roadmap/session-log.md`.
- Commit en español con prefijo semántico.

## 8. Reglas duras

- Nada de secrets en código (variables de entorno).
- No introducir dependencias de UI nuevas sin justificar.
- No borrar trabajo ajeno sin entenderlo.
