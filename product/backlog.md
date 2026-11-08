# Backlog — ERP LiveFlow

> Pendientes priorizados. Se actualiza al final de cada sesión (ver `roadmap/session-log.md`).

## 🔴 Alta prioridad

- [ ] **Conectores de carriers (Fase 4 de `docs/shipments-plan.md`)**: infra y registry completos (9 providers), endpoint `/api/carriers/providers` y UI de configuración listos. **Bloqueado**: llamadas HTTP reales por provider (requiere docs + credenciales de cada carrier). Ver issue #7.
- [x] **Tests de integración de rutas API**: suite determinista (`npm test` sin BD, `npm run test:db` con BD; CI activa `TEST_DB=1`). Completados: `/api/shipments`, `/api/caja`, `/api/conversaciones`, webhook MercadoPago, health, carriers. (153 tests con BD, 90 sin BD)
- [x] **Migraciones SQL versionadas**: `prisma/migrations/20261029210000_init` + `migration_lock.toml`, scripts `db:migrate`/`db:deploy`/`db:status`, CI usa `migrate deploy` + `migrate diff --exit-code`.
- [x] **Autenticación de operadores**: login/sesión end-to-end (`POST /api/auth/login`, cookie firmada, middleware, UI `/login`). Completado.

## 🟡 Media prioridad

- [x] **Multi-tenant real**: `orgId` generalizado a Lead, Conversation, PaymentOrder, Shipment, Carrier, Campaign, Product, LiveSession, MessageTemplate, BotConfig, ActivityLog. Modelo `Organization` con `settings` (JSONB). Sesión del operador guarda `orgId`. Todas las rutas API filtran por `orgId`. Migración SQL versionada con backfill de datos existentes. Seed con organización demo. Completado en v1.1.0. Ver issue #11.
- [ ] **Cola externa para workers**: reemplazar `setInterval` en proceso por un worker/cola que soporte múltiples instancias. Ver issue #8.
- [ ] **E2E con Playwright**: flujos críticos (crear lead → orden de pago → envío). Playwright no está instalado. Ver issue #10.

## 🟢 Deuda / mejoras

- [x] **Recordatorios automáticos de órdenes de pago pendientes**: Implementado worker, API `/api/caja/reminders`, UI en ConfigPage, y documentación. Ver feature #8.
- [x] **Documentar webhooks (MercadoPago)**: `docs/webhooks-mercadopago.md` creado (flujo, variables de entorno, cómo probar en local con túnel). Ver issue #12.
- [x] **Revisar dependencias sin uso**: Removido `cloudinary` (no estaba en uso). Diagramas actualizados.
- [ ] **Limpiar warnings de ESLint**: ~185 warnings preexistentes (`@typescript-eslint/no-explicit-any` y vars no usadas en proveedores simulados). Ver issue #9.
- [ ] **Centralizar manejo de errores de WhatsApp** (reconexión, QR expirado). Ver issue #14.

## 💡 Ideas / explorar

- [x] **E2E con Playwright**: Instalado `@playwright/test`, configuración y tests básicos creados. Ver issue #10.
- [ ] Panel de métricas en vivo por transmisión (LiveSession).
- [ ] Integración con calendario de transmisiones.
- [ ] Exportación/reportes programados por correo.

## Estado v1.0.0

- [x] Código funcional y verificado: `typecheck` 0 errores, `lint` 0 errores, `test` 90 passed (sin BD).
- [x] **Build de producción y tag v1.0.0**: ejecutado `npm run build` (EXIT 0), tag `v1.0.0` creado y publicado a `origin/master`. Ver issue #15.

## Estado v1.1.0 (multi-tenant orgId)

- [x] Código funcional y verificado: `typecheck` 0 errores, `lint` 0 errores, `test` 90 passed (sin BD).
- [x] **Build de producción**: `npm run build` → EXIT 0.
- [x] **Tag v1.1.0**: pendiente crear y publicar a `origin/master`.
