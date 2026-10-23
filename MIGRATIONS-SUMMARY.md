# Migraciones SQL versionadas - ERP LiveFlow

## 1) Evaluación de estrategia

- **Mantener datos existentes**: Las migraciones están diseñadas para ser no destructivas.
- **No remover enums solo agregar**: Usar `ALTER TYPE "NombreEnum" ADD VALUE 'valor'` para agregar nuevos valores sin afectar los existentes.
- **Columnas nuevas nullable**: Todas las columnas nuevas son optativas (`nullable` por default en Prisma).

## 2) Primera migración versiónada

```
prisma/migrations/20240101000001_initial/
├── migration.sql    # Crea todas las tablas, enums, relaciones e índices
└── migration.json   # Metadata de Prisma
```

## 3) Documentación en docs/

### docs/architecture.md (sección 7 - Base de datos)

- Flujo de trabajo completo: `prisma migrate dev` (dev) vs `prisma migrate deploy` (prod)
- Estructura de carpetas de migración
- Cómo agregar valores a enums de forma segura

### docs/conventions.md (sección Base de datos / Prisma)

- Flujo recomendado para crear y aplicar migraciones
- Patrón `ALTER TYPE ... ADD VALUE` para enums
- Comandos por entorno

## 4) `db push` para desarrollo

- El esquema en `prisma/schema.prisma` permanece intacto y compatible con `npx prisma db push`
- Las migraciones versionadas son adicionales y no reemplazan `db push` en dev

## 5) typecheck

- Estructura TypeScript válida
- `npm run typecheck` pasa exitosamente
