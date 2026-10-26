# Herramientas y repos recomendados — ERP LiveFlow

> Curaduría de herramientas y repos trending (octubre 2026) útiles para este proyecto. Para cada una: qué es, por qué sirve acá y cómo se implementa.
> Marcador: ✅ **implementada/recomendada** · 🟡 evaluar · ❌ no aplica.

## Agente y memoria

| Herramienta                                                | Qué es                                                                           | Uso acá                                                           | Estado                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- |
| [opencode-mem](https://github.com/tickernelz/opencode-mem) | Memoria persistente para OpenCode (vectores locales + captura automática)        | Memoria automática entre sesiones, inyectada en contexto          | ✅ Instalada (global `~/.config/opencode/opencode.json`) |
| [ai-memory](https://github.com/akitaonrails/ai-memory)     | Memoria a largo plazo para CLIs de agentes, handoff entre vendors                | Alternativa si se quiere memoria compartida Claude/Codex/OpenCode | 🟡 Evaluar                                               |
| [headroom](https://github.com/headroomlabs-ai/headroom)    | Comprime outputs de herramientas/logs antes de llegar al LLM (~20% menos tokens) | Ahorrar tokens con un modelo gratis                               | 🟡 Evaluar (MCP o plugin)                                |

## Calidad de vida en CLI (WSL)

| Herramienta                                             | Uso acá                                      | Estado         |
| ------------------------------------------------------- | -------------------------------------------- | -------------- |
| [fzf](https://github.com/junegunn/fzf)                  | Búsqueda difusa en archivos/historial        | ✅ Recomendada |
| [ripgrep](https://github.com/BurntSushi/ripgrep) (`rg`) | Búsqueda rápida en el repo                   | ✅ Recomendada |
| [eza](https://github.com/eza-community/eza)             | `ls` moderna con iconos                      | 🟡 Evaluar     |
| [zoxide](https://github.com/ajeetdsouza/zoxide)         | `cd` inteligente entre carpetas del proyecto | 🟡 Evaluar     |
| [lazygit](https://github.com/jesseduffield/lazygit)     | Git en TUI                                   | 🟡 Evaluar     |
| [bat](https://github.com/sharkdp/bat)                   | `cat` con sintaxis                           | 🟡 Evaluar     |

Instalar la mayoría en WSL con:

```bash
sudo apt update && sudo apt install -y fzf ripgrep
# eza, zoxide, lazygit, bat: usar sus instaladores oficiales o npm/bun
```

## API y testing

| Herramienta                           | Uso acá                                           | Estado                                 |
| ------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| [Hoppscotch](https://hoppscotch.io/)  | Cliente API open-source para probar las 26+ rutas | ✅ Recomendada (web o app)             |
| [Playwright](https://playwright.dev/) | E2E de flujos críticos                            | 🟡 Pendiente (backlog)                 |
| [k6](https://github.com/grafana/k6)   | Pruebas de carga (listados paginados, socket)     | 🟡 Evaluar                             |
| [Postman](https://www.postman.com/)   | Alternativa a Hoppscotch                          | ❌ Preferimos Hoppscotch (open-source) |

## Code review y automatización

| Herramienta                                                     | Uso acá                                              | Estado              |
| --------------------------------------------------------------- | ---------------------------------------------------- | ------------------- |
| [open-code-review](https://github.com/alibaba/open-code-review) | Review de diffs con checks deterministas + LLM       | 🟡 Evaluar (CLI/CI) |
| [PR-Agent](https://github.com/Codium-ai/pr-agent)               | Review de PRs en GitHub/GitLab                       | 🟡 Evaluar          |
| Skills de review                                                | `code-review`, `requesting-code-review` (instaladas) | ✅ En uso           |

## Base de datos y contenedores

| Herramienta                                                          | Uso acá                                          | Estado                                 |
| -------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------- |
| [Prisma Studio](https://www.prisma.io/studio)                        | Inspección visual de datos (`npm run db:studio`) | ✅ Ya incluido                         |
| [Portainer](https://github.com/portainer/portainer)                  | Gestión de contenedores en Docker Desktop        | 🟡 Evaluar (Docker Desktop ya trae UI) |
| [DBeaver](https://dbeaver.io/) / [TablePlus](https://tableplus.com/) | Cliente SQL de escritorio                        | 🟡 Evaluar                             |

## Observabilidad y analítica

| Herramienta                                      | Uso acá                                              | Estado     |
| ------------------------------------------------ | ---------------------------------------------------- | ---------- |
| [PostHog](https://github.com/PostHog/posthog)    | Analítica de producto open-source                    | 🟡 Evaluar |
| [Langfuse](https://github.com/langfuse/langfuse) | Observabilidad LLM (útil si se agrega IA generativa) | 🟡 Evaluar |
| [Sentry](https://sentry.io/)                     | Monitoreo de errores                                 | 🟡 Evaluar |

## Frontend y diseño

| Herramienta                         | Uso acá                                    | Estado                                 |
| ----------------------------------- | ------------------------------------------ | -------------------------------------- |
| [shadcn/ui](https://ui.shadcn.com/) | Componentes copiables sobre Radix/Base UI  | ✅ Ya usado (skill `shadcn` instalada) |
| [Figma](https://www.figma.com/)     | Diseño/prototipos                          | 🟡 Evaluar                             |
| Skills de diseño                    | `frontend-design`, `web-design-guidelines` | ✅ Instaladas                          |

## Diagramas

Diagramas escritos a mano en texto (nunca generados por IA), versionados en git. Guía completa en `docs/diagramas/README.md`.

| Herramienta                                   | Uso acá                                                                 | Estado              |
| --------------------------------------------- | ----------------------------------------------------------------------- | ------------------- |
| [D2](https://github.com/d2lang/d2)            | Arquitectura en `docs/diagramas/*.d2` → SVG commiteado (`npm run diagramas`) | ✅ Implementada     |
| [Mermaid](https://github.com/mermaid-js/mermaid) | ER, secuencias y estados dentro de `docs/*.md` (render nativo GitHub/Obsidian) | ✅ Implementada     |
| [Excalidraw](https://github.com/excalidraw/excalidraw) | Bocetos a mano alzada, solo si hacen falta                         | 🟡 Evaluar          |
| `diagram-design` / skills de diagramas por IA | Generan SVG "bonitos" pero no revisables en diff                        | ❌ No (queremos autoría y diff) |

```bash
npm run diagramas         # regenera los SVG desde los .d2
npm run diagramas:watch   # re-render al guardar
```

## Infra y despliegue

| Herramienta                        | Uso acá                                                                   | Estado     |
| ---------------------------------- | ------------------------------------------------------------------------- | ---------- |
| Vercel / Railway / Render / Fly.io | Hosting de Next.js + custom server (requiere ajuste por el server propio) | 🟡 Evaluar |
| PM2                                | Ya configurado (`ecosystem.config.js`)                                    | ✅ En uso  |
| Docker Compose                     | Ya configurado (`docker-compose.yml`)                                     | ✅ En uso  |

## MCP servers candidatos

Los MCP se configuran con:

```sh
opencode mcp add <nombre> --url <url>
opencode mcp list
```

Candidatos útiles:

- **Context7** — documentación de librerías al día (Next.js, Prisma).
- **Playwright MCP** — navegador headless para E2E y debugging visual.
- **Postgres/Prisma MCP** — inspección de BD (si está disponible).
- **Filesystem** — ya integrado de forma nativa.

## Cómo decidir

1. ¿Resuelve un dolor real hoy? Si no, se deja como 🟡.
2. ¿Agrega una dependencia pesada? Preferir herramientas que corran local y open-source.
3. ¿Mantiene el repo simple? Evitar sobre-ingeniería (principio del proyecto).
