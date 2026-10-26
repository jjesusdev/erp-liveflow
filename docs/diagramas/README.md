# Diagramas — ERP LiveFlow

> Diagramas del proyecto **escritos a mano en texto**, versionados en git y renderizados localmente. Nada de imágenes generadas por IA ni capturas de pizarra.

## Regla

1. El **`.d2` (o el bloque Mermaid) es la fuente de verdad**. El `.svg` es un artefacto: se regenera, no se edita.
2. Un cambio de arquitectura que no actualiza su diagrama está incompleto.
3. Si un diagrama necesita una explicación larga, la explicación va en el `.md`; el diagrama va al grano.

## Qué se usa y dónde

| Formato | Dónde vive | Por qué |
| ------- | ---------- | ------- |
| **D2** | `docs/diagramas/*.d2` → `.svg` | Arquitectura. Mejor layout y estética que Mermaid; el SVG se commitea y se ve en GitHub/README |
| **Mermaid** | Bloques dentro de `docs/*.md` | ER, secuencias y máquinas de estado. Renderiza nativo en GitHub, VS Code y Obsidian sin build |

Mermaid no necesita tooling. D2 sí:

```bash
curl -fsSL https://d2lang.com/install.sh | sh -s -- --prefix "$HOME/.local"
# si falla con "make: not found":
ln -sf ~/.local/lib/d2/d2-*/bin/d2 ~/.local/bin/d2
```

## Comandos

```bash
npm run diagramas         # render único de todos los .d2 → .svg
npm run diagramas:watch   # re-render al guardar (útil mientras se edita)
```

CI corre `npm run diagramas` y falla si el SVG commiteado no coincide con el `.d2`.

## Diagramas actuales

| Archivo | Qué muestra |
| ------- | ----------- |
| `arquitectura.d2` | Contenedores: navegador, custom server (Next + Socket.io + Baileys + workers), Prisma/PostgreSQL y servicios externos |

## Cómo agregar uno

1. Crear `docs/diagramas/<nombre>.d2` (o un bloque ` ```mermaid ` en el doc correspondiente).
2. `npm run diagramas`.
3. Enlazar el `.svg` desde el `.md` que corresponda.
4. Commitear **el `.d2` y el `.svg` juntos**.
