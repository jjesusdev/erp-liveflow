# Índice de Módulos

> Módulos del ERP. Usar la plantilla **Nota de Módulo** (`99 - Templates/Nota de Módulo.md`) para crear notas nuevas.

## Módulos

| Módulo              | Ruta         | Estado | Nota |
| ------------------- | ------------ | ------ | ---- |
| Dashboard Live      | `/`          | 🟢     |      |
| Monitor Live HUD    | `/live-hud`  | 🟢     |      |
| Caja & Cuadre       | `/caja`      | 🟢     |      |
| Clientas            | `/leads`     | 🟢     |      |
| Prendas / Catálogo  | `/products`  | 🟢     |      |
| Envíos & Reparto    | `/shipments` | 🟡     |      |
| Difusiones WhatsApp | `/campaigns` | 🟢     |      |
| Reportes & Métricas | `/reports`   | 🟢     |      |
| Manual Vendedoras   | `/manual`    | 🟢     |      |
| Configuración       | `/config`    | 🟢     |      |

## Notas

```dataview
TABLE estado, fecha
FROM "03 - Módulos"
SORT file.name ASC
```
