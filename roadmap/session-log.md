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
- [ ] Instalar plugins de Obsidian desde la app de Windows: **Dataview**, **Templater**, **Obsidian Git**.
- [ ] Abrir el vault desde Windows en `C:\Users\User\Documents\erp-liveflow\obsidian-vault`.

### Notas

- Comando correcto de Orca en Linux: `orca-ide` (nunca `orca`, que es el lector de pantalla GNOME).
- `npx skills` es el package manager de skills; globales en `~/.agents/skills/`, proyecto en `.agents/skills/` (OpenCode también lee `.opencode/skills/`).
- **Deduplicación**: se detectó una copia vieja en `~/proyectos/erp-liveflow` (WSL, en `cae4bb8`, sin `.opencode/`, sin `node_modules`). Se verificó que no tenía commits únicos ni procesos usándola y se eliminó. **Fuente única: `/mnt/c/Users/User/Documents/erp-liveflow`** (= `C:\Users\User\Documents\erp-liveflow`), accesible para OpenCode/Orca, Obsidian (Windows) y el navegador.
- **Mudanza a ext4**: el tooling en `/mnt/c` era 5-21× más lento (medido). Se clonó el repo a `~/proyectos/erp-liveflow` (ext4 nativo de WSL), se corrió `npm install` y se registró en Orca (`repo b1f976a6-...`). `typecheck` OK. **Pendiente**: crear `.env` desde `.env.example` y re-escanear el QR de WhatsApp. La copia de C: queda como respaldo hasta confirmar el cambio.
