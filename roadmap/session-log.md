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
