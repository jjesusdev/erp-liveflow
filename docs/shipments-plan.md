# Envíos & Logística — Plan de implementación (/shipments)

## 1. Estado actual
- `Shipment`: `paymentOrderId` @unique, `leadId`, `trackingNumber?`, `carrier?`, `status` (PENDING|IN_TRANSIT|DELIVERED|RETURNED|LOST), `shippedAt?`, `deliveredAt?`, `notes?`
- `shipmentUpdateSchema.status` incluye `"CANCELLED"` pero `ShipmentStatus` enum no lo tiene.
- `GET /api/shipments` devuelve todos los registros (sin paginación) e incluye `lead` + `paymentOrder` → no escala.
- UI: KPIs + tabla (filtros por estado, búsqueda, edición inline, acciones despachar/entregado, selección múltiple, BulkPrintView) + export CSV.
- Carriers en presets: **mexicanos** (Estafeta, 99minutos, Uber Flash/Didi) — erróneos para Chile.

## 2. Objetivo
Hacer `/shipments` escalable, multi-usuario y **configurable por cliente** (multi-carrier / flota propia). Debe soportar courier externo propio de cada empresa, sin asumir cliente oficial. Todo configurable.

## 3. Principios
- **Multi-tenant-friendly / configurable**: Carrier, servicio, credenciales, modos de entrega, plantillas — por empresa/usuario (`orgId`).
- **Sin cliente oficial**: soportar lo razonable; el usuario final configura lo suyo.
- **Escalable**: pasar GET a paginación server-side (mismo patrón que `/leads`).
- **Pragmático**: Fase 0 sin APIs externas; conectores plug-in por proveedor.
- **Coherente visual**: dark zinc + emerald; reutilizar patrón de `/leads` (toolbar segmentada, tabla paginada sticky, detalle).

## 4. Modelo de datos (Prisma)
### 4.1 Carrier
```prisma
enum CarrierMode { COURIER EXTERNAL_OWN_FLEET STORE_PICKUP }
enum CarrierApiProvider { MANUAL CHILEXPRESS BLUE SHIPIT ENVIAME STARKEN CORREOS SIMPLIROUTE BEETRACK }
model Carrier {
  id String @id @default(cuid())
  orgId String?
  code String
  name String
  mode CarrierMode
  apiProvider CarrierApiProvider @default(MANUAL)
  active Boolean @default(true)
  config Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  shipments Shipment[]
  @@unique([orgId, code])
}
```

### 4.2 ShipmentStatus (actualizar) — HECHO
Se conserva `PENDING` como estado inicial (no destructivo: solo se AGREGAN valores al enum, compatible con `db push` y datos existentes). No se usa `DRAFT` para evitar recrear el tipo en Postgres.
```prisma
enum ShipmentStatus {
  PENDING
  READY
  LABEL_PRINTED
  PICKED_UP
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  FAILED
  RETURNED
  LOST
  CANCELLED
}
```
Alineado con `shipmentUpdateSchema`. Aplicado con `npx prisma db push`.

## 6.b Config de transporte (HECHO)
`GET/POST /api/carriers` + `GET/PATCH/DELETE /api/carriers/[id]`. `GET ?meta=1` devuelve proveedores soportados (MANUAL, Chilexpress, Blue, Starken, Correos, Shipit, Enviame, SimpliRoute, Beetrack). La tabla de envíos carga los carriers activos desde la API (fallback a lista genérica si no hay).

### 4.3 Shipment (extender)
Columnas nullable para no romper datos existentes:
- `mode ShipmentMode?` (COURIER|OWN_FLEET|PICKUP)
- `carrierId String?` + relación
- `service String?`
- `weightGrams Int?`
- `dimensions Json?` ({w,h,l,unit})
- `costClp Int?`
- `labelUrl String?`
- `trackingUrl String?`
- `providerRef String?`
- `recipient Json?` ({name,phone,email})
- `address Json?` ({street,number,commune,region,zip})
- `driverId String?`
- `attempts Int @default(0)`
- `deliveredTo String?`
- `proofPhotoUrl String?`

Enum `ShipmentMode { COURIER OWN_FLEET PICKUP }`.

### 4.4 ShipmentEvent (nuevo)
```prisma
model ShipmentEvent {
  id String @id @default(cuid())
  shipmentId String
  shipment Shipment @relation(fields: [shipmentId], references: [id])
  status ShipmentStatus
  occurredAt DateTime @default(now())
  source EventSource @default(MANUAL) // MANUAL|API|WEBHOOK
  note String?
  payload Json?
}
enum EventSource { MANUAL API WEBHOOK }
```
Añadir `events ShipmentEvent[]` a `Shipment`.

## 5. API
- `GET /api/shipments` → paginado (`page,pageSize,q,status,mode,carrierId,from,to`). Incluir `lead`/`paymentOrder` mínimo; mover completo a detalle.
- `GET /api/shipments/[id]` → completo (`lead`, `paymentOrder`, `events`, `carrier`).
- `POST /api/shipments` → crear (acepta datos mínimos + modo/carrier).
- `PATCH /api/shipments/[id]` → actualizar estado/tracking/carrier/notes; insertar `ShipmentEvent` al cambiar estado. Mantener notificación WhatsApp existente.
- `GET/POST/PATCH /api/carriers` → CRUD configurables.
- `GET /api/carriers/providers` → proveedores soportados + metadata.
- `POST /api/shipments/:id/print-label`, `POST /api/shipments/bulk-labels`, `POST /api/shipments/bulk-manifest` → placeholders Fase 0.

## 6. UX propuesta
- **Toolbar**: segmented por estado + buscador (tracking/destinatario/lead) + filtro modo + filtro carrier + fechas.
- **Tabla paginada** (server-side), sticky header. Columnas: N°, Cliente, Modo, Carrier/Servicio, Tracking, Estado, Creado/Actualizado, Acciones.
- **Fila expandible o panel lateral** con timeline `ShipmentEvent`.
- **Detalle**: tabs General | Destinatario/Dirección | Ítems | Etiqueta/Tracking | Eventos | Notas.
- **Configuración → Carriers**: CRUD (activar/desactivar, modo, proveedor, config parcial). Cada usuario configura sus propios carriers (incluida flota propia/camioneta externa).
- **Bulk actions**: imprimir etiquetas, marcar despachado, generar manifiesto.
- **Estados visuales**: mantener paleta dark zinc + emerald.

## 7. Integraciones (plug-in)
Interfaz `CarrierProvider` (crear en `src/lib/carriers/types.ts`):
```ts
interface CarrierProvider {
  code: CarrierApiProvider
  canQuote?(ctx): Promise<Quote>
  createShipment(ctx): Promise<{tracking, labelUrl, providerRef, trackingUrl?}>
  printLabel?(ref): Promise<{url}>
  track?(ref): Promise<Events[]>
  webhook?(req): Promise<void>
}
```
Soportados: MANUAL (default), Chilexpress, Blue Express, Shipit, Enviame, Starken, Correos Chile, SimpliRoute, Beetrack. Fase 4 añade implementaciones bajo `src/lib/carriers/`.

## 8. Plan por fases
| Fase | Tareas | Estado |
|---|---|---|
| **0. Fundamentos** | Enum con nuevos estados (conservando `PENDING`). Modelos `Carrier` + `ShipmentEvent`. `Shipment` extendido (nullable). `shipmentUpdateSchema` ampliado. `db push` aplicado. | **HECHO** |
| **1. API escala** | `GET /api/shipments` paginado + filtros (`status` multi, `mode`, `carrierId`, `q`, `from/to`, `export`) + `stats` por estado. `GET /api/shipments/[id]` con `events`/`carrierRef`. CRUD `/api/carriers`. | **HECHO** |
| **2. UX `/shipments`** | `ShipmentTable` con estados nuevos, sticky header, paginación server-side, buscador, carriers dinámicos desde API, presets mexicanos eliminados. `useShipments` con paginación + debounce. KPIs actualizados (Por empaquetar / En camino / Entregados / Incidencias). | **HECHO (v1)** |
| **3. Eventos + reglas** | `ShipmentEvent` se inserta al cambiar estado (source MANUAL). `shippedAt`/`deliveredAt`, `attempts` en FAILED/RETURNED. WhatsApp al pasar a IN_TRANSIT. Conversación → SHIPPED. | **HECHO** |
| **4. Conectores** | `CarrierProvider` + registro. Empezar MANUAL. Añadir agregador (Shipit/Enviame) opcional. Directos Chilexpress/Blue si se configuran. Flota propia (SimpliRoute/Beetrack) opcional. | Pendiente (plug-in) |

## 8.b Verificación (Fase 0-3)
- `typecheck` OK · `lint` 0 errores (104 warnings preexistentes) · `format:check` OK · `test` 63/63.
- Runtime contra Postgres real: `/api/shipments` (base y filtros multi-estado) 200; `q=starken` 200; `export=1` 200; `/api/carriers?meta=1` 200 (9 proveedores); POST/PATCH/DELETE de carrier OK; PATCH de estado crea `ShipmentEvent` OK; `GET /api/shipments/[id]` con `events` OK; `/shipments` 200; `/leads` sin regresión.
- Enum en DB verificado (11 valores). Tablas `Carrier` y `ShipmentEvent` creadas.

## 9. Cambios inmediatos (mínimos seguros)
- `src/lib/schemas.ts`: `shipmentUpdateSchema` → incluir `CANCELLED`; validar `carrierId`/`mode` si aplica.
- `src/types/index.ts`: ampliar `Shipment` con campos nuevos (parciales).
- `src/components/shipments/ShipmentTable.tsx`: quitar presets mexicanos → cargar desde `/api/carriers` (fallback MANUAL).
- `src/app/api/shipments/route.ts`: paginación + incluir mínimo.
- `prisma/schema.prisma`: añadir enums/modelos/extensiones.

## 10. Decisión del usuario (resumen)
- Cada usuario configura todo a su gusto (sin cliente oficial).
- Volumen esperado: alto pero depende de empresa contratante → escalar desde ahora.
- Debe ser configurable (cualquier caso).
- Debe estar preparado para que cliente tenga **courier externo por propia cuenta** → configurable.
- Cotizador automático: no claro si tan útil → posponer (Fase 4 opcional).

## 11. Acción propuesta
Guardar este plan en `docs/shipments-plan.md` (hecho). **Empezar Fase 0**: schema + migración + schemas.ts + API paginado base + UX mínima coherente con `/leads`. ¿Aceptas empezar por Fase 0?
