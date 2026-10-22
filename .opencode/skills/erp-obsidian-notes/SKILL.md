---
name: ERP Obsidian Notes
description: Escribir y mantener notas en el vault de Obsidian de ERP LiveFlow. Usar cuando el usuario pide documentar algo en Obsidian o crear una nota (módulo, cliente, investigación, ADR, sesión).
---

# ERP Obsidian Notes

Cómo escribir notas en el vault de Obsidian de ERP LiveFlow (repo propio en `C:\Users\User\Documents\erp-vault`).

## Ubicación

- El vault vive en `C:\Users\User\Documents\erp-vault` (repo git propio, separado del código).
- Desde WSL: `/mnt/c/Users/User/Documents/erp-vault`.
- Se abre desde Windows en Obsidian: **Open folder as vault** → `C:\Users\User\Documents\erp-vault`.

## Convenciones del vault

- Carpetas numeradas: `00 - Inicio`, `01 - Proyecto`, `02 - Showcase`, `03 - Módulos`, `04 - Clientes`, `05 - Arquitectura`, `06 - Investigación`, `07 - Sesiones`, `99 - Templates`, `99 - Assets`.
- Enlaces con `[[Nombre de la nota]]` (markdown links habilitados).
- Frontmatter YAML: `fecha`, `tipo`, `tags`.
- Plantillas en `99 - Templates` (usan **Templater**: `{{date:YYYY-MM-DD}}`).
- Índices con `dataview`.

## Al crear una nota

1. Elegir la carpeta correcta según el tipo.
2. Copiar la plantilla de `99 - Templates` correspondiente.
3. Rellenar frontmatter (`fecha`, `tipo`, `tags`).
4. Enlazar desde el índice de la carpeta (y viceversa).
5. Actualizar `roadmap/session-log.md` si corresponde.

## Plantillas disponibles

| Plantilla                      | Carpeta destino      |
| ------------------------------ | -------------------- |
| Sesión de Trabajo              | `07 - Sesiones`      |
| Nota de Módulo                 | `03 - Módulos`       |
| Nota de Cliente                | `04 - Clientes`      |
| Nota de Investigación          | `06 - Investigación` |
| ADR (Decisión de Arquitectura) | `05 - Arquitectura`  |

## Notas

- El vault vive fuera del repo de código, en `C:\Users\User\Documents\erp-vault` (accesible desde WSL en `/mnt/c/Users/User/Documents/erp-vault`).
- El registro de sesiones "vivo" es `roadmap/session-log.md`; las notas del vault son la capa extendida.
- Plugins necesarios: **Dataview**, **Templater**, **Obsidian Git**.
