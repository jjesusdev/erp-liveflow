# Plan — Conectores de Carriers Fase 4

> Basado en `docs/shipments-plan.md` Fase 4 y en el backlog alta prioridad.

## Objetivo

Implementar el sistema plug-in `CarrierProvider` y los primeros conectores reales para que los envíos sean configurables por empresa sin depender de un cliente oficial.

## Estado previo

- Infra ya existe: `src/lib/carriers/types.ts`, `registry.ts`, `manual.ts`, `index.ts`, tests.
- MANUAL registrado por defecto.
- API `/api/carriers` y `/api/carriers/[id]` operativa.
- Modelo `Carrier` con `apiProvider` y `config Json`.

## Tareas

### 0. Preparación y auditoría

- [ ] 0.1 Revisar `src/lib/carriers/*` y tests existentes. Confirmar que `initializeCarrierRegistry` se ejecuta al arrancar.
- [ ] 0.2 Verificar enum `CarrierApiProvider` en Prisma coincide con proveedores planeados.
- [ ] 0.3 Crear carpeta `src/lib/carriers/providers/` para código de cada proveedor.

### 1. Base del plug-in

- [ ] 1.1 Crear clase abstracta `BaseCarrierProvider` con helpers de validación de config y mapeo de errores.
- [ ] 1.2 Añadir utilidades `src/lib/carriers/utils/http.ts` para requests con retry/timeout.
- [ ] 1.3 Definir esquema Zod de configuración por proveedor en `src/lib/schemas.ts` `carrierConfigSchemas`.

### 2. Provider MANUAL — consolidar

- [ ] 2.1 Asegurar que `ManualProvider.createShipment` actualiza `Shipment` y genera `ShipmentEvent` con source MANUAL.
- [ ] 2.2 Test de integración: crear carrier MANUAL + shipment → tracking generado.

### 3. Agregadores

- [ ] 3.1 **Shipit** — `src/lib/carriers/providers/shipit.ts`
  - [ ] 3.1.1 Implementar `code = 'SHIPIT'`, `requiredConfig: ['apiKey','apiSecret']`
  - [ ] 3.1.2 `createShipment` → POST a Shipit, mapear respuesta a `CreateShipmentResult`
  - [ ] 3.1.3 `track` opcional
  - [ ] 3.1.4 `validateConfig`
  - [ ] 3.1.5 Unit test con mock HTTP
- [ ] 3.2 **Enviame** — `src/lib/carriers/providers/enviame.ts`
  - [ ] 3.2.1 Mismo patrón que Shipit
  - [ ] 3.2.2 Tests unitarios

### 4. Proveedores directos Chile

- [ ] 4.1 **Chilexpress** — `src/lib/carriers/providers/chilexpress.ts`
  - [ ] 4.1.1 Config required: `clientId`,`clientSecret`,`subdomain`
  - [ ] 4.1.2 OAuth token cache en `carrierConfig` o memoria corta
  - [ ] 4.1.3 `createShipment`, `track`, `printLabel`
  - [ ] 4.1.4 Validación de config
- [ ] 4.2 **Blue Express** — `src/lib/carriers/providers/blue.ts`
  - [ ] 4.2.1 Implementar flujo API Blue
  - [ ] 4.2.2 Tests

### 5. Registro y arranque

- [ ] 5.1 En `initializeCarrierRegistry`, registrar Shipit, Enviame, Chilexpress, Blue condicionalmente a `process.env.ENABLE_CARRIER_PROVIDERS`.
- [ ] 5.2 Exponer `getAvailableProviders` en API `/api/carriers/providers` con metadata de `requiredConfig`.

### 6. Integración con API de shipments

- [ ] 6.1 En `POST /api/shipments`, si `carrierId` apunta a proveedor no MANUAL, invocar `provider.createShipment`.
- [ ] 6.2 Actualizar `PATCH /api/shipments/[id]` para refrescar tracking vía `provider.track`.
- [ ] 6.3 Manejar errores de proveedor → `ShipmentEvent` con source API + nota de error, no romper transacción.
- [ ] 6.4 Añadir endpoint `POST /api/shipments/:id/sync-tracking`.

### 7. UI Configuración

- [ ] 7.1 En `/config/carriers`, mostrar campos dinámicos según `requiredConfig` del proveedor.
- [ ] 7.2 Validar config al guardar usando `provider.validateConfig`.
- [ ] 7.3 Indicador de salud del proveedor (test connection).

### 8. Tests y calidad

- [ ] 8.1 Tests unitarios para cada provider con MSW/nock.
- [ ] 8.2 Test de integración: crear carrier Shipit con config mock → crear shipment → resultado esperado.
- [ ] 8.3 `npm run typecheck && npm run lint && npm run test` verde.

### 9. Documentación

- [ ] 9.1 `docs/carriers/README.md` con instrucciones de configuración por proveedor, variables requeridas, limits.
- [ ] 9.2 Actualizar `docs/shipments-plan.md` con estado Fase 4.
- [ ] 9.3 Entrada en `roadmap/session-log.md` al cierre.

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
