# Diseño: Multi-tenant real con orgId

> ERP LiveFlow — v1.1 (post v1.0.0). Cada cliente de la plataforma es una **organización (org)** con su propio equipo de operadores que comparten leads, conversaciones, cobros y envíos dentro de esa org. Un operador solo ve y edita datos de su org.

## Intent y por qué

Hoy solo `Carrier` tiene un `orgId` opcional (por defecto `null`). Todas las demás entidades (Lead, Conversation, PaymentOrder, Shipment, etc.) no saben a qué negocio pertenecen. Si dos clientes distintos usan la plataforma, sus datos se mezclan.

El objetivo es que cada cliente tenga su propio espacio aislado: sus leads, sus conversaciones de WhatsApp, sus órdenes de cobro, sus envíos, sus campañas y su catálogo, operados por su equipo de vendedoras.

## Alcance (v1.1 de multi-tenant)

**Incluido:**

- Modelo `Organization` (id, name, slug, isActive, timestamps).
- `orgId` requerido en: `Operator`, `Lead`, `Conversation`, `Message`, `PaymentOrder`, `Shipment`, `Carrier`, `Campaign`, `Product`, `BusinessConfig`, `LiveSession`, `MessageTemplate`, `BotConfig`, `ActivityLog`.
- `ShipmentEvent` no lleva `orgId` propio: hereda la organización de su `Shipment`.
- La sesión del operador guarda `orgId` (además de `operatorId` y `role`).
- Cada ruta de API filtra por `orgId` del operador autenticado en lecturas y asigna `orgId` en escrituras.
- Validación de propiedad: si un operador intenta acceder a un recurso de otra org → 404 (no se filtra que exista) o 403.
- Migración SQL versionada: crear una organización "Default" por defecto, backfill de datos existentes, luego hacer `orgId` requerido.
- Seed: organización y operadores de demostración.

**No incluido (versiones futuras):**

- Un operador perteneciente a múltiples organizaciones (1 operador = 1 org por ahora).
- Sub-organizaciones / jerarquía de equipos.
- Facturación o planes por organización.
- Dominios personalizados por org (slug se reserva pero no se usa para routing todavía).

## Modelo de datos

### Nuevo: Organization

```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String?  @unique
  isActive  Boolean  @default(true)
  settings  Json?    // tokens de WhatsApp, credenciales de pago, etc.
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  operators      Operator[]
  leads          Lead[]
  conversations  Conversation[]
  messages       Message[]
  paymentOrders  PaymentOrder[]
  shipments      Shipment[]
  carriers       Carrier[]
  campaigns      Campaign[]
  products       Product[]
  liveSessions   LiveSession[]
  messageTemplates MessageTemplate[]
  botConfigs     BotConfig[]
  activityLogs   ActivityLog[]

  @@index([slug])
  @@index([isActive])
}
```

### Cambios en modelos existentes (agregar `orgId` requerido + relación)

| Modelo            | Cambio                                                     | Notas                                                   |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| `Operator`        | `orgId String`, `organization Organization @relation(...)` | Un operador = una org.                                  |
| `Lead`            | `orgId String`, `organization Organization @relation`      |                                                         |
| `Conversation`    | `orgId String`, `organization`                             |                                                         |
| `Message`         | `orgId String`, `organization`                             |                                                         |
| `PaymentOrder`    | `orgId String`, `organization`                             |                                                         |
| `Shipment`        | `orgId String`, `organization`                             |                                                         |
| `Carrier`         | `orgId` de `String?` a `String` requerido                  | `@@unique([orgId, code])` se mantiene.                  |
| `Campaign`        | `orgId String`, `organization`                             |                                                         |
| `Product`         | `orgId String`, `organization`                             | Obligatorio, inventario aislado por tienda.             |
| `LiveSession`     | `orgId String`, `organization`                             |                                                         |
| `MessageTemplate` | `orgId String`, `organization`                             |                                                         |
| `BotConfig`       | `orgId String`, `organization`                             |                                                         |
| `ActivityLog`     | `orgId String`, `organization`                             |                                                         |
| `BusinessConfig`  | — (eliminada)                                              | Su información vive en `Organization.settings` (JSONB). |

**Tablas globales del sistema (sin orgId, no creadas en este MVP):**
`Users` y `SubscriptionPlans`. Si en el futuro se añaden, van sin `orgId` porque pertenecen al nivel SaaS, no a una tienda específica.

`ShipmentEvent` no cambia: se filtra a través de `shipment.orgId`.

## Resolución del orgId en runtime

La sesión del operador (cookie firmada, `src/lib/session.ts`) ya guarda `operatorId` y `role`. Se agrega `orgId`:

- `createSession(operatorId, role, orgId)` guarda los tres.
- Nuevo export `getOrgIdFromSession()` (o un objeto `getOperatorContext()` que devuelve `{ operatorId, orgId, role }`).
- En login (`POST /api/auth/login`), tras autenticar, se carga el operador **con su organización** y se guarda el `orgId` en la sesión.
- Middleware ya exige sesión para rutas protegidas; las API routes obtienen el `orgId` desde la sesión en cada request.

No se inyecta `orgId` automáticamente en Prisma (no hay middleware de Prisma para esto). Cada handler lo pasa explícitamente. Para reducir olvidos, se agrega un helper:

```ts
// src/lib/org.ts
export function whereOrg(orgId: string): Record<string, string> {
  return { orgId };
}
```

## Reglas de acceso por organización

1. **Lectura (listado)**: `where: { ...whereOrg(orgId), ...otrosFiltros }`. Nunca se devuelven datos de otra org.
2. **Lectura (detalle por ID)**: `where: { id, orgId }`. Si no existe o es de otra org → 404 (no se revela existencia).
3. **Escritura (crear)**: `data: { ...campos, orgId }` con el `orgId` del operador autenticado. El cliente no puede enviar `orgId` en el body (se ignora si viene).
4. **Escritura (actualizar/eliminar)**: `where: { id, orgId }`. Si no coincide → 404.
5. **Relaciones cruzadas**: al crear un `Shipment` para un `PaymentOrder`, se verifica que ambos pertenezcan a la misma org. Si no → 400.

## Cambios en API (patrón a seguir en cada ruta)

```ts
import { getOperatorContext } from "@/lib/session"; // nuevo

handler: async (req, parsedBody) => {
  const { orgId } = await getOperatorContext(req); // lee sesión, 401 si no hay
  // ...
  const rows = await prisma.lead.findMany({
    where: { ...whereOrg(orgId), ...filtros },
  });
  // crear:
  await prisma.lead.create({ data: { ...campos, orgId } });
};
```

`getOperatorContext(req)`:

- Lee la sesión (`getSession()`).
- Si no hay sesión válida → lanza error que `apiHandler` convierte en 401 (o el middleware ya lo hace; para API routes el middleware retorna 401, pero tenerlo aquí es defensa en profundidad).
- Retorna `{ operatorId, orgId, role }`.

## Migración de datos existentes

La base de datos actual tiene datos con `orgId = null` (o sin la columna). Plan:

1. Migración SQL `add_organization`: crear tabla `Organization`, agregar columnas `orgId` (nullable) a todas las entidades, agregar índices y foreign keys.
2. Seed/migración de datos: insertar una organización "Default" (slug `default`), hacer `UPDATE` en cada tabla seteando `orgId = id_de_default` donde sea null.
3. Migración SQL `make_orgid_required`: alterar columnas `orgId` a NOT NULL, agregar `@@unique([orgId, code])` en Carrier si no existe, eliminar valores huérfanos.

Todas las migraciones son versionadas (`prisma/migrations/YYYYMMDDHHMMSS_<nombre>/`). Se aplica con `prisma migrate deploy`.

## Seed de demostración

`prisma/seed.js` crea:

- Organización "Demo LiveFlow" (slug `demo`).
- Operadores de ejemplo (`admin@erp.local`, `vendedora@erp.local`) asociados a esa org.
- Leads, conversaciones, cobros y envíos de ejemplo con `orgId` de la org demo.

## Riesgos y mitigaciones

| Riesgo                                                                 | Mitigación                                                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Olvidar filtrar por `orgId` en alguna ruta y filtrar datos de otra org | Code review enfocado en `whereOrg`; tests de integración que crean datos de dos orgs y verifican aislamiento. |
| Un operador accede a ID de otra org adivinando UUID                    | Siempre `where: { id, orgId }` en detalles; 404 si no coincide.                                               |
| Romper datos existentes en migración                                   | Backfill obligatorio antes de hacer NOT NULL; probar migración en BD vacía y con datos.                       |

## Pruebas sugeridas (tests de integración)

- Crear lead en org A y org B; listar leads de org A solo retorna los de A.
- Detalle de un lead de org B con token de org A → 404.
- Crear shipment con paymentOrder de otra org → 400.
- Login de operador de org A → sesión contiene orgId de A.

---

**¿Qué falta por decidir (tuyas):**

1. ¿El slug de organización se usa para algo hoy (p. ej. subdominio o URL `/org/:slug`) o solo se reserva para futuro?
2. ¿Un operador puede pertenecer a más de una organización ahora o siempre es 1:1?
3. ¿Hay tablas de la lista que prefieras dejar fuera de orgId por ahora (p. ej. `Product` o `BusinessConfig`) para reducir el alcance?

Una vez apruebes este diseño, paso al plan de implementación (`writing-plans`) y luego a codear.
