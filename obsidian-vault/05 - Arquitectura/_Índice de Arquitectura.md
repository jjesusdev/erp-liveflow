# Índice de Arquitectura

> Decisiones y notas de arquitectura. Las decisiones formales van como **ADR** (`99 - Templates/ADR (Decisión de Arquitectura).md`).

## ADRs

```dataview
TABLE estado, fecha
FROM "05 - Arquitectura"
WHERE tipo = "ADR"
SORT file.name ASC
```

## Documentación técnica (repo)

| Documento                | Contenido                               |
| ------------------------ | --------------------------------------- |
| `docs/architecture.md`   | Arquitectura del sistema por capas      |
| `docs/domain-model.md`   | Entidades, relaciones y enums de Prisma |
| `docs/conventions.md`    | Convenciones de código y API            |
| `docs/herramientas.md`   | Herramientas y repos recomendados       |
| `docs/shipments-plan.md` | Plan de envíos/logística                |

## Relacionado

- [[01 - Proyecto/Brief]]
- [[_Índice de Módulos]]
