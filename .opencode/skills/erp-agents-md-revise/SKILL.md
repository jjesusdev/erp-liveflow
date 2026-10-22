---
name: ERP Agents MD Revise
description: Actualizar el cerebro del proyecto (AGENTS.md, docs, product, roadmap, session-log) al final de una sesión productiva. Usar cuando la sesión termina con cambios o decisiones importantes.
---

# ERP Agents MD Revise

Actualiza el **cerebro** del proyecto para que la próxima sesión arranque con contexto.

## Archivos del cerebro

| Archivo                     | Cuándo actualizar                                                           |
| --------------------------- | --------------------------------------------------------------------------- |
| `roadmap/session-log.md`    | **Siempre**: agregar entrada con contexto, decisiones, hecho, pendiente     |
| `AGENTS.md`                 | Si cambiaron reglas, estructura o punteros                                  |
| `docs/*.md`                 | Si cambió arquitectura, dominio, convenciones o herramientas                |
| `product/modules.md`        | Si cambió el estado de un módulo                                            |
| `product/backlog.md`        | Si se agregaron/resolvieron pendientes                                      |
| `roadmap/roadmap.md`        | Si avanzó una fase                                                          |
| Vault de Obsidian (externo) | Conocimiento extendido (notas, ADRs) en `C:\Users\User\Documents\erp-vault` |

## Entrada de session-log

```markdown
## YYYY-MM-DD — Sesión N: <título>

### Contexto

- <qué pasó antes>

### Decisiones

- <decisión> → <por qué>

### Hecho

- <lista concreta>

### Pendiente

- [ ] <ítem>

### Notas

- <detalles técnicos>
```

## Reglas

- Escribir en español.
- Ser concreto: nombres de archivo, rutas, comandos.
- Marcar lo no destructivo y lo que queda de deuda.
- No inventar estado: si algo no se verificó, dejarlo como pendiente.
- Si se creó una skill propia, documentarla.
