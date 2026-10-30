# Plan — Conectores de Carriers Fase 4

> Basado en `docs/shipments-plan.md` Fase 4 y en el backlog alta prioridad.
> Última actualización: 2026-10-29.

## Objetivo

Implementar el sistema plug-in `CarrierProvider` y los primeros conectores reales para que los envíos sean configurables por empresa sin depender de un cliente oficial.

## Estado real (2026-10-29)

- **Infra completa**: interfaz, clase base, utilidades HTTP, schemas Zod y registry con 9 providers (MANUAL + 8 reales).
- **API lista para la UI**: `GET /api/carriers/providers` expone `requiredConfig` y capacidades desde el registry; `/api/carriers?meta=1` usa la misma fuente (se eliminó la lista hardcodeada).
- **Integración de shipments**: `POST /api/shipments` invoca el provider y `PATCH /api/shipments/[id]` refresca tracking.
- **⚠️ Los providers son simulados salvo Shipit**: `Shipit.createShipment` y `Shipit.track` hacen llamadas HTTP reales cuando se proveen credenciales (apiKey/apiSecret en config del Carrier o env `SHIPIT_*`); sin credenciales usan stub simulado (fallback seguro). Los demás providers (ENVIAME, CHILEXPRESS, BLUE, STARKEN, CORREOS, SIMPLIROUTE, BEETRACK) siguen simulados pendiente de docs y credenciales.
- **Decisión**: no se agregó el flag `ENABLE_CARRIER_PROVIDERS`. Con un solo despliegue y MANUAL como fallback, el flag agrega superficie de configuración sin beneficio. Se reevalúa si aparece un segundo entorno.

## Tareas

### 0. Preparación y auditoría

- [x] 0.1 Revisar `src/lib/carriers/*` y tests existentes. Confirmar que `initializeCarrierRegistry` se ejecuta al arrancar.
- [x] 0.2 Verificar enum `CarrierApiProvider` en Prisma coincide con proveedores planeados.
- [x] 0.3 Crear carpeta `src/lib/carriers/providers/` para código de cada proveedor.

### 1. Base del plug-in

- [x] 1.1 Crear clase abstracta `BaseCarrierProvider` con helpers de validación de config y mapeo de errores.
- [x] 1.2 Añadir utilidades `src/lib/carriers/utils/http.ts` para requests con retry/timeout.
- [x] 1.3 Definir esquema Zod de configuración por proveedor en `src/lib/schemas.ts` `carrierConfigSchemas`.

### 2. Provider MANUAL — consolidar

- [x] 2.1 Asegurar que `ManualProvider.createShipment` actualiza `Shipment` y genera `ShipmentEvent` con source MANUAL.
- [ ] 2.2 Test de integración: crear carrier MANUAL + shipment → tracking generado.

### 3. Agregadores

- [x] 3.1 **Shipit** — `src/lib/carriers/providers/shipit.ts`
  - [x] 3.1.1 Implementar `code = 'SHIPIT'`, `requiredConfig: ['apiKey','apiSecret']`
  - [x] 3.1.2 `createShipment` → POST a Shipit, mapear respuesta a `CreateShipmentResult` (llamada HTTP real cuando hay credenciales; stub sin ellas)
  - [x] 3.1.3 `track` → GET a Shipit (llamada HTTP real cuando hay credenciales; `[]` sin ellas)
  - [x] 3.1.4 `validateConfig`
  - [x] 3.1.5 Unit test con mock HTTP (`src/lib/carriers/__tests__/shipit.test.ts`)
- [x] 3.2 **Enviame** — `src/lib/carriers/providers/enviame.ts`
  - [x] 3.2.1 Mismo patrón que Shipit (**simulado**)
  - [ ] 3.2.2 Tests unitarios

### 4. Proveedores directos Chile

- [x] 4.1 **Chilexpress** — `src/lib/carriers/providers/chilexpress.ts`
  - [x] 4.1.1 Config required: `clientId`,`clientSecret`,`subdomain`
  - [ ] 4.1.2 OAuth token cache en `carrierConfig` o memoria corta
  - [ ] 4.1.3 `createShipment`, `track`, `printLabel` (**simulado**)
  - [x] 4.1.4 Validación de config
- [x] 4.2 **Blue Express** — `src/lib/carriers/providers/blue.ts`
  - [ ] 4.2.1 Implementar flujo API Blue (**simulado**)
  - [ ] 4.2.2 Tests
- [x] 4.3 **Starken, Correos, SimpliRoute, Beetrack** — providers registrados con config y validación (**simulados**).

### 5. Registro y arranque

- [ ] 5.1 En `initializeCarrierRegistry`, registrar condicionalmente a `process.env.ENABLE_CARRIER_PROVIDERS`. **Descartado** (ver Estado real).
- [x] 5.2 Exponer `getAvailableProviders` en API `GET /api/carriers/providers` con metadata de `requiredConfig`.

### 6. Integración con API de shipments

- [x] 6.1 En `POST /api/shipments`, si `carrierId` apunta a proveedor no MANUAL, invocar `provider.createShipment`.
- [x] 6.2 Actualizar `PATCH /api/shipments/[id]` para refrescar tracking vía `provider.track`.
- [ ] 6.3 Manejar errores de proveedor → `ShipmentEvent` con source API + nota de error (hoy solo `console.error`).
- [ ] 6.4 Añadir endpoint `POST /api/shipments/:id/sync-tracking`.

### 7. UI Configuración

- [ ] 7.1 En `/config/carriers`, mostrar campos dinámicos según `requiredConfig` del proveedor.
- [ ] 7.2 Validar config al guardar usando `provider.validateConfig`.
- [ ] 7.3 Indicador de salud del proveedor (test connection).

### 8. Tests y calidad

- [ ] 8.1 Tests unitarios para cada provider con MSW/nock.
- [ ] 8.2 Test de integración: crear carrier Shipit con config mock → crear shipment → resultado esperado.
- [x] 8.3 `npm run typecheck && npm run lint && npm run test` verde.

### 9. Documentación

- [ ] 9.1 `docs/carriers/README.md` con instrucciones de configuración por proveedor, variables requeridas, limits.
- [ ] 9.2 Actualizar `docs/shipments-plan.md` con estado Fase 4.
- [x] 9.3 Entrada en `roadmap/session-log.md` al cierre.

## Criterios de aceptación

- Se puede crear un Carrier con `apiProvider = SHIPIT` y guardar `config`.
- `POST /api/shipments` con ese carrier invoca el provider y guarda `trackingNumber`, `providerRef`, `labelUrl`.
- `GET /api/carriers/providers` lista MANUAL + proveedores implementados.
- Tests unitarios pasan sin llamadas reales.
- Sin regresión en `/shipments` existente y `/leads`.

## Notas

- No implementar cotizador automático ahora.
- Flota propia SimpliRoute/Beetrack se deja para iteración posterior.
- Mantener MANUAL como fallback siempre disponible.
- Antes de llamar APIs reales: confirmar documentación y credenciales por carrier, y agregar tests con HTTP mockeado.
