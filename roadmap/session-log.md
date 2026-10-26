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
