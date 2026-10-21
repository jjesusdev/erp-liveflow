# Roadmap — ERP LiveFlow

> Plan por fases. El detalle de una feature grande vive en `docs/<feature>-plan.md`.

## Fase 0 — Setup y cerebro ✅

- [x] Estructura `AGENTS.md` + `docs/` + `product/` + `roadmap/`.
- [x] Vault de Obsidian.
- [x] Skills del ecosistema + skills propias del proyecto.
- [x] Config de OpenCode (`opencode.json`) + memoria automática (`opencode-mem`).
- [x] Fix de `core.fileMode` (repo en `/mnt/c`).

## Fase 1 — Fundamentos ✅

- [x] Stack Next.js 15 + Prisma + PostgreSQL.
- [x] Módulos base: Leads, Chat/WhatsApp, Pagos, Envíos, Campañas, Caja, Catálogo, Reportes, Manual, Config.
- [x] Custom server con Socket.io + Baileys.
- [x] CI (typecheck, lint, format, test, build).

## Fase 2 — Operación en vivo ✅

- [x] Workspace operativo (inbox, chat, ficha 360, catálogo lateral, HUD).
- [x] Órdenes de cobro express + expiración automática.
- [x] Cuadre de caja y métricas.

## Fase 3 — Escala y configuración ✅ (v1)

- [x] Envíos multi-carrier configurables (Fases 0-3 de `docs/shipments-plan.md`).
- [x] Paginación server-side en listados.

## Fase 4 — Conectores e integraciones 🟡

- [ ] `CarrierProvider` + conectores plug-in (ver `product/backlog.md`).
- [ ] Migraciones SQL versionadas.
- [ ] Autenticación de operadores.
- [ ] E2E (Playwright) y más tests de integración.

## Fase 5 — Multi-tenant y producción 🟢

- [ ] `orgId` transversal.
- [ ] Cola externa para workers.
- [ ] Observabilidad y monitoreo.

## Cómo se trabaja

1. Elegir ítem del `product/backlog.md` o crear una feature nueva.
2. Leer `AGENTS.md` + `roadmap/session-log.md` + docs relevantes.
3. Diseñar (`brainstorming` → `writing-plans`) y documentar en `docs/`.
4. Implementar (`implement-spec` / `test-driven-development`).
5. Verificar (`typecheck`, `lint`, `test`) y revisar (`code-review`).
6. Cerrar la sesión: agregar entrada a `roadmap/session-log.md`.
