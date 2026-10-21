---
name: ERP Code Explorer
description: Explorar y entender el código de ERP LiveFlow (rutas, módulos, API, Prisma). Usar cuando el usuario pregunta "dónde está X", "cómo funciona Y" o hay que rastrear un flujo.
---

# ERP Code Explorer

Guía para navegar el código de **ERP LiveFlow** y responder "dónde/cómo" rápido.

## Mapa rápido

| Pregunta                  | Dónde mirar                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| Rutas/páginas             | `src/app/**/page.tsx`                                                                                    |
| API                       | `src/app/api/**/route.ts`                                                                                |
| Componentes UI            | `src/components/ui/*`                                                                                    |
| Design system             | `src/components/liveflow/*`                                                                              |
| Módulo concreto           | `src/components/<modulo>/*` (leads, shipments, caja, chat, campaigns, products, config, reports, manual) |
| Hooks de datos            | `src/hooks/*`                                                                                            |
| Lógica compartida         | `src/lib/*` (api-handler, schemas, prisma, socket, format, audit)                                        |
| Tipos/enums               | `src/types/index.ts`, `src/lib/enums.ts`                                                                 |
| Modelo de datos           | `prisma/schema.prisma`                                                                                   |
| Socket / WhatsApp / pagos | `server/socket/*`, `server/whatsapp/*`, `server/payments/*`                                              |
| Workers                   | `src/lib/campaignSender.ts`, `src/lib/orderExpirationWorker.ts`                                          |
| Estilos                   | `src/app/globals.css`, `tailwind.config.ts`                                                              |

## Rutas de la app

`/` · `/live-hud` · `/caja` · `/leads` · `/products` · `/shipments` · `/campaigns` · `/reports` · `/manual` · `/config`

## Flujo de datos típico

```
Componente (useX) → fetch /api/<recurso> → apiHandler (Zod) → Prisma → PostgreSQL
Socket.io: server emite eventos → useSocket() en cliente → estado en UI
```

## Consejos

- Usar `grep` sobre `src/app/api` para listar endpoints y sus métodos.
- Usar `grep` sobre `src/lib/schemas.ts` para ver qué campos acepta cada ruta.
- Las páginas grandes se descomponen en componentes + hook; buscar el hook `use<Modulo>` asociado.
- El sidebar/nav define las rutas oficiales: `src/components/layout/Sidebar.tsx`.

## Entregar

- Responder con rutas de archivo concretas y un resumen del flujo.
- Si el usuario quiere un cambio, derivar a `erp-feature-dev`.
