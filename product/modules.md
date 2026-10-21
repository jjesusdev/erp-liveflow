# Módulos — ERP LiveFlow

> Módulos de la aplicación y su estado. Las rutas son las del `NavRail`/`Sidebar`.

| Módulo              | Ruta         | Qué hace                                     | Estado                             |
| ------------------- | ------------ | -------------------------------------------- | ---------------------------------- |
| Dashboard Live      | `/`          | Vista general del día (métricas + actividad) | 🟢 En producción                   |
| Monitor Live HUD    | `/live-hud`  | HUD en tiempo real durante la transmisión    | 🟢 En producción                   |
| Caja & Cuadre       | `/caja`      | Ingresos/egresos, sweeps, cuadre diario      | 🟢 En producción                   |
| Clientas            | `/leads`     | Directorio de clientas, ficha, filtros       | 🟢 En producción                   |
| Prendas / Catálogo  | `/products`  | Catálogo, stock, importación                 | 🟢 En producción                   |
| Envíos & Reparto    | `/shipments` | Logística multi-carrier, tracking, eventos   | 🟡 En evolución (Fase 4 pendiente) |
| Difusiones WhatsApp | `/campaigns` | Campañas masivas a clientas                  | 🟢 En producción                   |
| Reportes & Métricas | `/reports`   | Métricas de negocio                          | 🟢 En producción                   |
| Manual Vendedoras   | `/manual`    | Guía operativa para vendedoras               | 🟢 En producción                   |
| Configuración       | `/config`    | Negocio, banco, bot, reglas live, mantención | 🟢 En producción                   |

## Componentes transversales

- **Chat / Workspace**: `src/components/chat/*` + `src/components/liveflow/workspace/*` (inbox, chat, panel de clienta, cargo, catálogo lateral, HUD).
- **Kanban de conversaciones**: `src/components/kanban/*`.
- **Pago**: `src/components/payment/PaymentModal.tsx`.
- **Design system**: `src/components/liveflow/*` (nav-rail, primitives, cuadre, hud).
- **Layout**: `src/components/layout/*` (AppShell, NavRail, CommandPalette, SocketStatus).

## Backend transversal

- **WhatsApp**: `server/whatsapp/*`.
- **Pagos**: `server/payments/mercadopago.ts` + webhook.
- **Workers**: `src/lib/campaignSender.ts`, `src/lib/orderExpirationWorker.ts`.
- **API**: `src/app/api/*` (26+ rutas).

## Notas

- Los módulos se construyen descomponiendo páginas en componentes + hook (`useX`).
- El diseño sigue el patrón de `/leads`: toolbar segmentada, tabla paginada sticky, panel de detalle.
- Ver `docs/architecture.md` y `docs/domain-model.md` para el detalle técnico.
