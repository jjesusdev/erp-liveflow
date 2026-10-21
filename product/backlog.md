# Backlog — ERP LiveFlow

> Pendientes priorizados. Se actualiza al final de cada sesión (ver `roadmap/session-log.md`).

## 🔴 Alta prioridad

- [ ] **Conectores de carriers (Fase 4 de `docs/shipments-plan.md`)**: interfaz `CarrierProvider` + registro; empezar con MANUAL, luego agregador (Shipit/Enviame) y directos (Chilexpress/Blue).
- [ ] **Tests de integración de rutas API**: cubrir los endpoints principales (`/api/leads`, `/api/shipments`, `/api/caja`, `/api/conversations`, webhook de MercadoPago).
- [ ] **Migraciones SQL versionadas**: hoy solo `prisma db push`; evaluar `prisma migrate` para producción.
- [ ] **Autenticación de operadores**: completar login/sesión (hoy `Operator.passwordHash` sin flujo).

## 🟡 Media prioridad

- [ ] **Multi-tenant real**: generalizar `orgId` más allá de `Carrier` (Lead, Conversation, PaymentOrder, Shipment).
- [ ] **Cola externa para workers**: reemplazar `setInterval` en proceso por un worker/cola que soporte múltiples instancias.
- [ ] **E2E con Playwright**: flujos críticos (crear lead → orden de pago → envío).
- [ ] **Cobertura de tests**: subir de 63 tests; priorizar integración.

## 🟢 Deuda / mejoras

- [ ] Limpiar warnings de ESLint (104 preexistentes).
- [ ] Revisar dependencias sin uso (p. ej. `cloudinary` vs flujo real de medios).
- [ ] Documentar webhooks (MercadoPago) y cómo probarlos en local (ngrok/túnel).
- [ ] Centralizar manejo de errores de WhatsApp (reconexión, QR expirado).
- [ ] Observabilidad básica (logs estructurados, errores).

## 💡 Ideas / explorar

- [ ] Panel de métricas en vivo por transmisión (LiveSession).
- [ ] Recordatorios automáticos de órdenes de pago pendientes.
- [ ] Integración con calendario de transmisiones.
- [ ] Exportación/reportes programados por correo.
