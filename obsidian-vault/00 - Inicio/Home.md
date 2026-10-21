# ERP LiveFlow — Vault de Obsidian

> Sistema ERP operativo para **Live Shopping + WhatsApp** — proyecto en construcción.

## Navegación

- 📋 [[01 - Proyecto/Brief]] · [[01 - Proyecto/README]]
- 🏆 [[02 - Showcase/_Índice de Showcase]]
- 📦 [[03 - Módulos/_Índice de Módulos]]
- 👥 [[04 - Clientes/_Índice de Clientes]]
- 📐 [[05 - Arquitectura/_Índice de Arquitectura]]
- 🔍 [[06 - Investigación/_Índice de Investigación]]
- 📝 [[07 - Sesiones/_Índice de Sesiones]]

## Estado del proyecto

| Fase                   | Estado | Progreso |
| ---------------------- | ------ | -------- |
| Setup y cerebro        | 🟢     | 100%     |
| Fundamentos            | 🟢     | 100%     |
| Operación en vivo      | 🟢     | 100%     |
| Escala y configuración | 🟡     | 95%      |
| Conectores             | 🟡     | 50%      |
| Multi-tenant           | 🟢     | 0%       |

## Plugins necesarios (instalar desde la app de Windows)

- **Dataview** — para las tablas dinámicas (`dataview` en las notas de índices).
- **Templater** — las plantillas usan sintaxis `{{date:YYYY-MM-DD}}`.
- **Obsidian Git** — para versionar y sincronizar el vault (está dentro del repo).

## Últimas sesiones

```dataview
TABLE duración, temas
FROM "07 - Sesiones"
SORT file.name DESC
LIMIT 5
```

## Notas

- El vault vive en el repo: `obsidian-vault/`. Se abre desde Windows en `C:\Users\User\Documents\erp-liveflow\obsidian-vault`.
- El registro de sesiones "vivo" está en `roadmap/session-log.md` (fuente de verdad); el vault es la capa de conocimiento.
