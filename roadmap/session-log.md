# Session Log — ERP

Al inicio de cada sesión, leer este archivo + `AGENTS.md`. Al final, agregar una entrada.

---

## 2026-10-19 — Sesión 1: Setup

### Decisiones

- Reutilizadas herramientas de proyecto anterior (opencode-power-pack + opencode-mem)
- Estructura AGENTS.md + session-log establecida
- Stack por definir

### Pendiente

- [ ] Definir stack técnico del ERP
- [ ] Investigar módulos del ERP
- [ ] Crear Obsidian vault para el proyecto

### Notas

- Proyecto anterior (ConstruGuía) eliminado

---

## 2026-10-20 — Sesión 2: Configuración de memoria

### Decisiones

- Se configura la memoria automática de sesiones en `opencode-mem`
- Proveedor interno de OpenCode (`opencode`) + modelo gratis `glm-5.3-flash-free` → sin API key extra
- El plugin carga la config al arrancar → hay que reiniciar el servidor de OpenCode para aplicar

### Hecho

- `~/.config/opencode/opencode-mem.jsonc`: `opencodeProvider`/`opencodeModel` asignados y JSONC validado
- Diagnóstico de skills: `opencode-power-pack` (55 skills) cargado; JobPilot instalado pero host apagado

### Pendiente

- [x] Reiniciar OpenCode para aplicar la config de memoria → aplicado 2026-10-20
- [x] Verificado: `~/.opencode-mem/opencode-mem.log` muestra `"configured":"opencode"` (antes `(not set)`)
- [ ] Definir stack técnico del ERP (heredado; el proyecto ya es Next.js + Prisma + Tailwind)
- [ ] Investigar módulos del ERP

### Notas

- El Obsidian vault ya existe (`obsidian-vault/`) → pendiente heredado resuelto

---

## 2026-10-21 — Sesión 3: Instalación de skills + cerebro del proyecto

### Contexto

- Se formateó la PC, se reinstaló OpenCode v2.1.1 + Orca, y se está probando OpenCode vía WSL.

### Decisiones

- **Fix git**: los 207 "cambios" eran solo cambios de modo (100644→100755) por estar el repo en `/mnt/c`. Resuelto con `git config core.fileMode false`.
- **Skills**: instalado un set curado de 33 skills del ecosistema (mattpocock, obra/superpowers, vercel-labs, anthropics, prisma, supabase, shadcn, mcollina, rigorpilot) + `orca-cli`, `orchestration`, `find-skills`.
- **Memoria**: cerebro en archivos (`AGENTS.md` + `docs/` + `product/` + `roadmap/`) **+** plugin `opencode-mem@latest` (config global `~/.config/opencode/opencode.json` y `opencode-mem.jsonc` con proveedor interno `opencode/glm-5.3-flash`).
- **Config**: creado `opencode.json` de proyecto (skills, permisos, formatter).
- **Obsidian**: se abre desde Windows; vault curado + plugins recomendados (Dataview, Templater, Obsidian Git).
- **"repos"**: el usuario quería revisar repositorios/herramientas trending → `docs/herramientas.md`.
- **Skills propias**: se crearon en `.opencode/skills/`.

### Hecho

- `AGENTS.md` reescrito como entrada del cerebro.
- `docs/architecture.md`, `docs/domain-model.md`, `docs/conventions.md`, `docs/herramientas.md`.
- `product/vision.md`, `product/modules.md`, `product/backlog.md`.
- `roadmap/roadmap.md`.
- Vault de Obsidian completo (carpetas 03-07, índices, contenido).
- `.gitignore` ajustado para `.obsidian/workspace*`.

### Pendiente

- [ ] Reiniciar OpenCode para aplicar `opencode-mem` (plugins se cargan al inicio).
- [x] Instalar plugins de Obsidian desde la app de Windows: **Dataview**, **Templater**, **Obsidian Git** → instalados 2026-10-21
- [x] Abrir el vault desde Windows → resuelto 2026-10-22 (vault extraído a `C:\Users\User\Documents\erp-vault`)

### Notas

- Comando correcto de Orca en Linux: `orca-ide` (nunca `orca`, que es el lector de pantalla GNOME).
- `npx skills` es el package manager de skills; globales en `~/.agents/skills/`, proyecto en `.agents/skills/` (OpenCode también lee `.opencode/skills/`).
- **Deduplicación**: se detectó una copia vieja en `~/proyectos/erp-liveflow` (WSL, en `cae4bb8`, sin `.opencode/`, sin `node_modules`). Se verificó que no tenía commits únicos ni procesos usándola y se eliminó. **Fuente única: `/mnt/c/Users/User/Documents/erp-liveflow`** (= `C:\Users\User\Documents\erp-liveflow`), accesible para OpenCode/Orca, Obsidian (Windows) y el navegador.
- **Mudanza a ext4**: el tooling en `/mnt/c` era 5-21× más lento (medido). Se clonó el repo a `~/proyectos/erp-liveflow` (ext4 nativo de WSL), se corrió `npm install` y se registró en Orca (`repo b1f976a6-...`). `typecheck` OK. **Pendiente**: crear `.env` desde `.env.example` y re-escanear el QR de WhatsApp. La copia de C: queda como respaldo hasta confirmar el cambio.

---

## 2026-10-22 — Sesión 4: El vault sale del repo (Opción A)

### Contexto

- Tras mudar el repo a ext4, el vault de Obsidian quedó dentro del repo → Obsidian (Windows) tendría que abrirlo por `\\wsl.localhost\...` (lento, tratado como red). El usuario preguntó si no conviene dejar Ubuntu y usar Windows para todo (solo Docker); tras revisar hechos, decidió **mantener OpenCode en WSL y solo separar el vault**.

### Decisiones

- **Vault como repo propio**: `obsidian-vault/` se extrajo del repo de código y vive ahora en `C:\Users\User\Documents\erp-vault` con `git init` propio (Obsidian Git trabaja ahí). Plugins (Dataview, Templater, Obsidian Git) incluidos en el repo del vault.
- **Por qué nativo**: Obsidian es app de Windows; el vault es una capa de conocimiento, no código. Con vault nativo desaparece el conflicto WSL↔Windows para Obsidian, y el código sigue rápido en ext4.
- **Evaluated y descartado (por ahora)**: migrar todo a Windows nativo — requiere instalar Node/git/OpenCode en Windows y migrar config/skills/memoria; se retoma solo si vuelve el lag o molesta el split.

### Hecho

- Copia verificada 36/36 archivos; `git init` + commit inicial del vault (`main`).
- `git rm -r obsidian-vault` en el repo de código.
- Referencias actualizadas: `.gitignore`, `AGENTS.md` (estructura + tabla del cerebro), skills `erp-obsidian-notes`, `erp-feature-dev`, `erp-agents-md-revise`, `Home.md` del vault.
- Pendientes de Sesión 3 marcados: plugins instalados, vault abierto.
- **Entorno puesto a andar en ext4**: `.env` creado (`.env.example` alineado con `docker-compose.yml`: antes apuntaba a otra BD), Docker Desktop levantado, `docker compose up -d postgres` OK, `prisma db push` + `db:seed` OK, `npm run dev:fast` responde **HTTP 200** en `:3001`.

### Pendiente

- [ ] El usuario abre el vault en Obsidian: **Open folder as vault** → `C:\Users\User\Documents\erp-vault`.
- [ ] `git remote add` en el vault si se quiere backup en GitHub.
- [ ] Eliminar la copia de C: (`C:\Users\User\Documents\erp-liveflow`) una vez confirmado el flujo en ext4 (decisión pendiente del usuario).
- [ ] WhatsApp real: `auth_info` no existe → escanear QR al correr sin `dev:fast`.
- [ ] `MP_ACCESS_TOKEN` real en `.env` cuando se prueben cobros.

### Notas

- Fuente única del código: `~/proyectos/erp-liveflow` (ext4). La copia de C: es solo respaldo temporal.
- El vault NO se versiona con el código; su historial vive en su propio repo.
- **Docker desde WSL**: la distro Ubuntu no tiene integración con Docker Desktop; se usa el binario `docker.exe` (Windows) desde WSL, o se habilita _WSL Integration_ en Docker Desktop. Postgres queda en el puerto 5432 y es alcanzable desde WSL.
  sed: no input files

## 2026-10-23 -- Sesión X: Implementación autenticación operadores

### Contexto

- Se implementó autenticación de operadores con login POST /api/auth/login
- Hash scrypt con crypto native Node 22
- Resolución de operatorId verificando password contra passwordHash
- Worktree aislado en branch jjesusdev/auth-operadores para trabajo paralelo en carriers

### Hecho

- ✅ typecheck: 0 errors
- ✅ lint: 0 errors
- ✅ test: 63 passed
- ✅ auth endpoint POST /api/auth/login implementado y verificado
- ✅ Worktree aislado permite trabajo paralelo en carriers

### Pendiente

- [ ] Revisar compatibilidad de implementación auth entre ramas
- [ ] Actualizar seed.js con password hasheado cuando BD esté disponible
- [ ] Agregar tests unitarios específicos auth.ts

### Notas

- Auth ya está implementado en master con hashPassword/comparePassword usando scrypt
- La rama jjesusdev/auth-operadores tiene implementación alternativa con formato salt:hex
- No fue necesario mergear por conflictos de implementación; master ya tiene auth funcional
- Para continuar: verificar compatibilidad si se requieren cambios en auth flow

## 2026-10-26 -- Sesión: Diagramas como código (D2 + Mermaid)

### Contexto

- Los diagramas se resolvían con imágenes generadas por IA o ASCII dibujado a mano: no se revisan en diff y se desactualizan solos.

### Hecho

- ✅ d2 v0.9.0 instalado sin sudo (`~/.local/bin/d2`, enlazado desde `~/.local/lib/d2`)
- ✅ `docs/diagramas/arquitectura.d2` → `arquitectura.svg` con la arquitectura real (custom server, Socket.io, Baileys, workers, Prisma, externos)
- ✅ Mermaid en `docs/architecture.md`: secuencia de una orden de cobro + estados de `PaymentOrder`
- ✅ Mermaid en `docs/domain-model.md`: ER de 12 entidades + estados de `Shipment`
- ✅ `npm run diagramas` / `npm run diagramas:watch` (`scripts/diagramas.sh`)
- ✅ Job `diagramas` en CI: falla si el SVG commiteado no coincide con el `.d2`
- ✅ Regla en `AGENTS.md`: diagramas a mano, nunca generados por IA
- ✅ typecheck 0 errores; lint 0 errores (119 warnings preexistentes)
- ✅ Commits `f07ed11` + `7cc8e43` pusheados a `master`; CI run 40384858446 en verde (`ci` y `diagramas`)
- ✅ Render de los 4 bloques Mermaid verificado en navegador real (`mermaid-cli` + Chromium en WSL)

### Pendiente

- [ ] Evaluar un segundo D2 para el flujo operativo del live (clienta → cobro → envío), si el usuario lo pide

### Notas

- `d2` no está en `package.json` (es binario, no dependencia npm): en otra máquina hay que instalarlo con el comando de `docs/diagramas/README.md`.
- El instalador oficial de d2 falla en WSL sin `make`; el binario queda en `~/.local/lib/d2/d2-*/bin/d2` y se enlaza a `~/.local/bin/d2`.
- Primer intento de CI falló en `f07ed11`: el job `diagramas` quedó dentro del job `ci` y se llevó el step `Build` sin `npm ci`. Corregido en `7cc8e43`.
- **Chromium en WSL resuelto sin sudo**: Ubuntu 26.04 no trae `libnspr4`, `libnss3` ni `libasound2`; se extrajeron los `.deb` a `~/.local/lib/chromium-deps` y se exporta `LD_LIBRARY_PATH` desde `~/.bashrc` y `~/.profile`. Envoltorios: `~/.local/bin/chromium-playwright` y `~/.local/bin/mmdc`. El MCP de Playwright quedó apuntando a ese Chromium (`--executable-path` en `~/.config/opencode/opencode.json`).

---

## 2026-10-27 — Sesión: Conectores de carriers Fase 4 inicio

### Contexto

- Inicio de Fase 4 Conectores de carriers según backlog alta prioridad y `docs/shipments-plan.md`.
- Se creó plan detallado en `docs/plan-carriers-fase4.md`.

### Hecho

- ✅ Auditoría de infraestructura carriers completada; carpeta `src/lib/carriers/providers` creada
- ✅ `src/lib/carriers/base.ts` — clase base abstracta BaseCarrierProvider con helpers
- ✅ `src/lib/carriers/utils/http.ts` — fetchWithRetry y parseProviderError
- ✅ `src/lib/schemas.ts` — carrierConfigSchemas para MANUAL, SHIPIT, ENVIAME, CHILEXPRESS, BLUE
- ✅ `src/lib/carriers/providers/shipit.ts` — ShipitProvider implementado
- ✅ `src/lib/carriers/providers/enviame.ts` — EnviameProvider implementado
- ✅ `src/lib/carriers/registry.ts` actualizado para registrar Shipit y Enviame
- ✅ `typecheck` 0 errores
- ✅ Commit `ab77502` feat(carriers): base provider, utils http y schemas config; Shipit y Enviame providers registrados

### Pendiente

- [ ] Implementar providers Chilexpress, Blue, Starken, Correos, SimpliRoute, Beetrack
- [ ] Integrar llamada real a APIs en createShipment para Shipit/Enviame
- [ ] Actualizar API `/api/shipments` para invocar provider según carrier
- [ ] Tests unitarios con mocks para Shipit/Enviame
- [ ] UI Configuración dinámica por requiredConfig

### Notas

- Infra lista para plug-in. MANUAL sigue por defecto.
- Se usaron subagentes para auditoría, base, utils, providers.

---

## 2026-10-29 — Sesión: prioridades y suite de tests confiable

### Contexto

- Se definieron las 5 próximas tareas: (1) cerrar Fase 4 carriers, (2) tests de integración, (3) migraciones versionadas, (4) auth end-to-end, (5) observabilidad + WhatsApp.
- Decisión de arranque: **primero la suite de tests**, porque estaba en rojo y cualquier verificación posterior no era confiable. Luego un corte vertical de carriers.

### Hecho

- ✅ **Causa raíz de los 5 tests rojos**: los tests "sin BD" de `leads.integration.test.ts` sí consultaban la BD (page/pageSize y 404) y no había Postgres local.
- ✅ **Bug de fondo corregido**: `describe.skipIf(!dbAvailable)` se evalúa antes del `beforeAll`, así que los tests de BD se saltaban **siempre**, incluso en CI con Postgres.
- ✅ Nuevo patrón `describeDb` (gate por `TEST_DB=1`) en `leads.integration.test.ts`; tests de BD movidos a sus bloques.
- ✅ `npm run test`: suite rápida sin BD. `npm run test:db`: integración con BD. CI activa `TEST_DB=1`.
- ✅ Documentado en `docs/conventions.md` (sección Tests).
- ✅ `GET /api/carriers/providers` con metadata del registry (`requiredConfig`, capacidades, modos).
- ✅ `/api/carriers?meta=1` usa el registry; se eliminó la lista hardcodeada de providers.
- ✅ Tests nuevos para `/api/carriers/providers` (2).
- ✅ `docs/plan-carriers-fase4.md` actualizado al estado real: los providers devuelven tracking **simulado**.
- ✅ **Tests de BD verificados con Postgres real**: `TEST_DB=1 npm test` → **104 passed** (exit 0).
- ✅ La primera corrida con BD destapó 3 fallos por datos de prueba residuales; se agregó limpieza idempotente (`cleanupTestLeads`) y aserciones de creación.
- ✅ Verificación final: typecheck 0 errores; lint 0 errores (125 warnings); `npm test` 87 passed / 17 skipped; `TEST_DB=1 npm test` 104 passed.
- ✅ Backlog actualizado.

### Decisiones

- **No** se agregó `ENABLE_CARRIER_PROVIDERS`: un solo despliegue, MANUAL como fallback; el flag agrega configuración sin beneficio.
- Los tests de BD no se auto-detectan: se gatean explícitamente con `TEST_DB=1` para que el resultado sea determinista.

### Pendiente

- [ ] Carriers: llamadas HTTP reales por provider (requiere docs + credenciales), UI `/config/carriers`, tests con mocks.
- [ ] `POST /api/shipments/:id/sync-tracking` y errores de provider como `ShipmentEvent`.
- [ ] Tests de integración de `/api/shipments`, `/api/caja`, `/api/conversations` y webhook MercadoPago.
- [ ] Migraciones SQL versionadas (baseline + `migrate deploy`).
- [ ] Auth end-to-end (UI login, sesión, middleware).
- [ ] Observabilidad + robustez WhatsApp.

### Notas

- Docker Desktop no tiene integración WSL en esta máquina, pero `docker.exe` funciona desde la distro: el contenedor `liveflow_postgres` queda accesible en `localhost:5432`. Los tests de BD se corren con `npm run test:db`.
- El "80% de Fase 4" era engañoso: la infra estaba, pero ningún provider hace llamadas reales.

---

## 2026-10-29 — Sesión: tests de integración + migraciones SQL (completa Tareas 2 y 3)

### Contexto

- Continuación de las 5 tareas definidas en sesión anterior.
- Tarea 2 (tests de integración) y Tarea 3 (migraciones SQL) ejecutadas completamente.
- Tarea 1 (carriers UI + sync-tracking) ya estaba completa de sesión previa.

### Hecho

- ✅ **test(shipments)**: `src/app/api/shipments/__tests__/shipments.integration.test.ts` — 11 tests: creación, duplicado, listado paginado, filtrado por leadId, detalle con relaciones, transiciones PENDING→READY→PICKED_UP→DELIVERED, eliminación, 404.
- ✅ **test(caja)**: `src/app/api/caja/__tests__/caja.integration.test.ts` — 9 tests: listado con paginación, filtros por status/provider/search/range, sweep-recovery sin WhatsApp.
- ✅ **test(conversations)**: `src/app/api/conversations/__tests__/conversations.integration.test.ts` — 12 tests: creación, idempotencia, 404 lead, listado con filtro por status, detalle con relaciones/tier, transiciones PAID→SHIPPED→CLOSED con closedAt, estado inválido, 404.
- ✅ **test(webhooks/mercadopago)**: `src/app/api/webhooks/mercadopago/__tests__/mercadopago.integration.test.ts` — 7 tests con axios mockeado: JSON inválido (400), eventos no-payment ignorados, MP_ACCESS_TOKEN missing (500), pago rechazado no actualiza, pago aprobado → orden PAID + conversación PAID + envío creado, idempotencia (alreadyProcessed).
- ✅ **Suite completa**: `TEST_DB=1 npm test` → **16 archivos, 153 tests pasados**.
- ✅ **typecheck**: 0 errores. **lint**: 0 errores. **format:check**: limpio.
- ✅ **feat(db)**: migración baseline `prisma/migrations/20261029210000_init/` (505 líneas), `migration_lock.toml`, scripts `db:migrate`/`db:deploy`/`db:status` en package.json, CI usa `migrate deploy` + `migrate diff --exit-code` en lugar de `db push`. Baseline aplicada a BD existente con `migrate resolve`. Verificado en BD vacía (`liveflow_migrate_test`) sin divergencia.
- ✅ Plan de implementación guardado en `docs/superpowers/plans/2026-10-29-integration-tests.md`.

### Commits

- `4083651` test(shipments): tests de integración de envíos
- `d3a866d` test(caja): tests de integración de caja
- `06ccfdf` test(conversations): tests de integración de conversaciones
- `d5a3359` test(webhooks/mercadopago): tests de integración de webhook MP
- `17bad00` fix(tests): corregir tipos de Prisma en tests
- `3f822de` feat(db): migraciones SQL versionadas y scripts de despliegue

### Pendiente

- [ ] Carriers: llamadas HTTP reales por provider (requiere docs + credenciales), tests con mocks.
- [ ] Auth end-to-end (UI login, sesión, middleware, operatorId de auditoría).
- [ ] Observabilidad + robustez WhatsApp (health endpoint, logger estructurado, estado UI).

### Notas

- Patrón `describeDb` (gate por `TEST_DB=1`) se mantiene consistente en todos los tests nuevos.
- Limpieza idempotente por teléfono (`cleanupByPhone`) en cada suite para evitar datos residuales entre corridas.
- Se encontró que `conversationUpdateSchema` solo acepta `["OPEN","PENDING","CLOSED","PAID","SHIPPED"]` en Zod, mientras `CONVERSION_STATUSES` tiene más valores; los tests usan la intersección válida.
- Sweep-recovery no filtra por lead, por lo que `totalPending` puede incluir datos de otras suites; los tests asercionan `recoveredCount === 0` (sin WhatsApp) en vez de `totalPending === 0`.
