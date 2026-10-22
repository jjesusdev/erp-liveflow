# AGENTS.md — ERP LiveFlow

> Este archivo es el **punto de entrada del cerebro del proyecto**. El agente debe leerlo al inicio de cada sesión, junto con `roadmap/session-log.md`, y actualizar el session-log al final.

## Proyecto

**LiveFlow CRM** es una plataforma operativa para **Live Shopping** (TikTok / Instagram / YouTube Live) integrada a **WhatsApp** que emite **órdenes de cobro express** al vuelo, sin depender de inventario estricto. Atiende clientas por chat, cobra por MercadoPago/transferencia, envía pedidos y hace cuadre de caja.

- Código, commits y documentación en **español**.
- Ingeniero de software trabajando **solo, a tiempo parcial** → priorizar lo que mueve el negocio; evitar sobre-ingeniería.
- Stack real: **Next.js 15 + React 19 + TypeScript + PostgreSQL + Prisma + Socket.io + Baileys (WhatsApp Web) + MercadoPago**. No asumir otro stack.

## Estructura

```
erp-liveflow/
├── AGENTS.md              ← este archivo (entrada)
├── opencode.json          ← config del agente (skills, permisos, formatter)
├── docs/                  ← arquitectura, dominio, convenciones, decisiones
├── product/               ← visión, módulos, backlog
├── roadmap/               ← plan y session-log
├── prisma/                ← schema + seed
├── server/                ← custom server (Express + Socket.io + Baileys)
├── src/
│   ├── app/               ← App Router (pages + API routes)
│   ├── components/        ← ui/ (primitivas) + liveflow/ (design system) + módulos
│   ├── hooks/             ← useLeads, useShipments, useCaja, useChatPanel
│   ├── lib/               ← api-handler, schemas, prisma, socket, format, audit
│   └── types/             ← tipos compartidos
└── .opencode/skills/      ← skills propias del proyecto
```

## Comandos

```bash
npm install
npm run dev          # desarrollo (puerto 3001)
npm run dev:fast     # sin WhatsApp ni workers
npm run build
npm run start
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
npm run test
npm run db:push
npm run db:seed
npm run db:studio
```

Antes de dar algo por terminado: `npm run typecheck && npm run lint && npm run test`. En cambios grandes, correr `npm run build` también.

## Reglas

- **Español** en código, commits y documentación.
- **No poner secrets en código** — variables de entorno (`.env`, ver `.env.example`).
- **Tests de integración > unitarios** (tiempo parcial): probar comportamiento de rutas/API, no solo funciones puras.
- **API**: toda ruta nueva usa `apiHandler` + esquemas Zod (`src/lib/api-handler.ts`, `src/lib/schemas.ts`). Paginación server-side (patrón de `/api/leads`).
- **UI**: paleta dark zinc + emerald. Reutilizar `src/components/ui` (Radix/Base UI) y el design system de `src/components/liveflow`. No introducir dependencias de UI nuevas sin justificarlas.
- **BD**: cambios de esquema con `npx prisma db push` y pensando en datos existentes (columnas nuevas nullable, enums solo se **agregan** valores).
- **No borrar/reescribir trabajo ajeno** sin entenderlo primero.
- **Commits en español**, prefijos semánticos (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).

## Flujo de trabajo (qué skill usar)

| Necesidad                                    | Skill                                                           |
| -------------------------------------------- | --------------------------------------------------------------- |
| Entender/diseñar una feature antes de codear | `brainstorming` → `writing-plans`                               |
| Implementar una feature con spec             | `implement-spec` o `test-driven-development`                    |
| Diseñar UI                                   | `frontend-design` + `web-design-guidelines`                     |
| Refactor de arquitectura                     | `improve-codebase-architecture` + `vercel-composition-patterns` |
| Rendimiento React/Next.js                    | `vercel-react-best-practices`                                   |
| Review de cambios                            | `code-review` (grandes) / `requesting-code-review`              |
| Debuggear                                    | `systematic-debugging` → `diagnosing-bugs`                      |
| BD / Prisma                                  | `supabase-postgres-best-practices` + `prisma-client-api`        |
| Actualizar el cerebro                        | `erp-agents-md-revise` (ver `.opencode/skills/`)                |
| Explorar el código                           | `erp-code-explorer` (ver `.opencode/skills/`)                   |
| Coordinar subagentes                         | `orchestration` / `orca-cli`                                    |

## Cerebro (archivos de contexto)

| Archivo                     | Qué contiene                                                                     | Cuándo leerlo                            |
| --------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------- |
| `roadmap/session-log.md`    | Registro de sesiones y decisiones                                                | **Siempre al inicio**; escribir al final |
| `docs/architecture.md`      | Arquitectura del sistema, capas, tiempo real, WhatsApp, pagos                    | Al tocar backend/server                  |
| `docs/domain-model.md`      | Entidades, relaciones y enums de Prisma                                          | Al tocar `prisma/schema.prisma`          |
| `docs/conventions.md`       | Convenciones de código y API                                                     | Al escribir código nuevo                 |
| `docs/herramientas.md`      | Herramientas y repos externos recomendados                                       | Al evaluar nuevas herramientas           |
| `product/vision.md`         | Visión y alcance                                                                 | Al priorizar                             |
| `product/modules.md`        | Módulos y estado                                                                 | Al planear features                      |
| `product/backlog.md`        | Pendientes priorizados                                                           | Al elegir qué hacer                      |
| Vault de Obsidian (externo) | Conocimiento extendido, en `C:\Users\User\Documents\erp-vault` (repo git propio) | Consulta puntual                         |

## Convenciones rápidas

- Rutas de API en `src/app/api/<recurso>/route.ts`; detalle en `src/app/api/<recurso>/[id]/route.ts`.
- Tipos compartidos en `src/types/index.ts`; enums en `src/lib/enums.ts`.
- Formato de moneda/fechas en `src/lib/format.ts` y `src/lib/date-utils.ts`.
- Auditoría en `src/lib/audit.ts` + tabla `ActivityLog`.
- No hardcodear datos; usar seed/demo solo para desarrollo (`npm run db:seed`).

## Idioma

Código, commits y documentación en español.
