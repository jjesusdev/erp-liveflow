# Webhooks de MercadoPago

> Documenta cómo funcionan, cómo probarlos en local y qué hace el endpoint al recibir un pago aprobado.

## Endpoint

`POST /api/webhooks/mercadopago` (`src/app/api/webhooks/mercadopago/route.ts`)

MercadoPago envía este webhook para notificar cambios de estado de los pagos creados con `createMercadoPagoLink` (`server/payments/mercadopago.ts`).

## Variables de entorno

| Variable              | Ejemplo                 | Descripción                                            |
| --------------------- | ----------------------- | ------------------------------------------------------ |
| `MP_ACCESS_TOKEN`     | `TEST-xxx`              | Token de acceso de MercadoPago (sandbox o producción). |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` | URL base usada en los `back_urls` de preferencia.      |

En desarrollo usar credenciales de **sandbox** (`TEST-...`). En producción usar token de acceso real.

## Flujo de pago (resumen)

1. La app crea una preferencia de checkout con `POST /api/payment-orders` y `createMercadoPagoLink`.
2. La clienta paga desde el link de MercadoPago.
3. MercadoPago notifica al webhook `POST /api/webhooks/mercadopago`.
4. El webhook valida el pago y, si está `approved`, marca la orden como pagada.

## Procesamiento del webhook

El endpoint (`route.ts`) hace lo siguiente, en orden:

1. **Parseo del cuerpo**: JSON inválido → `400`.
2. **Filtro de evento**: solo procesa `type === "payment"` y `action === "payment.created"`; cualquier otro evento responde `200 { received: true }` sin hacer nada.
3. **Obtiene el `paymentId`** de `body.data.id`; si no hay, responde `200` sin hacer nada.
4. **Valida `MP_ACCESS_TOKEN`**: si falta o es un placeholder (`...xxx`), responde `500`.
5. **Consulta el pago en MercadoPago**: `GET https://api.mercadopago.com/v1/payments/{paymentId}`.
6. **Filtro por estado**: si el pago no está `approved`, responde `200` sin hacer nada.
7. **Busca la orden** por `external_reference` (el `id` de la `PaymentOrder`). Si no existe → `404`.
8. **Idempotencia**: si la orden ya está `PAID`, responde `200 { received: true, alreadyProcessed: true }` y no reprocesa.
9. **Transacción atómica** (`prisma.$transaction`):
   - Actualiza `PaymentOrder` a `status: "PAID"`, `paidAt: ahora` y guarda `mpPaymentId` en `metadata`.
   - Actualiza la `Conversation` vinculada a `status: "PAID"`.
   - Crea una `Shipment` en `PENDING` si aún no existe para esa orden.
10. **Notificación por Socket.io**: emite `payment:confirmed`, `payment:updated`, `conversation:updated` y `shipment:created` si hay `io` disponible.
11. Responde `200 { received: true }`.

Cualquier error inesperado se registra en consola y responde `500`.

## Cómo probar en local

MercadoPago no puede hacer HTTP a `localhost`. Usar un túnel público (ngrok, localtunnel, Cloudflare Tunnel) que exponga el puerto `3001`:

```bash
# Ejemplo con ngrok
ngrok http 3001
```

Luego configurar la **URL de notificaciones (webhooks)** en el panel de MercadoPago (o de la aplicación de sandbox) apuntando a:

```
https://<tunel>.ngrok.io/api/webhooks/mercadopago
```

### Prueba rápida sin túnel (suite de pruebas)

El proyecto trae pruebas de integración que mockean axios:

```bash
npm run test:db
# incluye src/app/api/webhooks/mercadopago/__tests__/mercadopago.integration.test.ts
```

Casos cubiertos:

- JSON inválido → 400
- Eventos que no son `payment.created` ignorados
- `MP_ACCESS_TOKEN` faltante → 500
- Pago rechazado no actualiza la orden
- Pago aprobado → orden `PAID` + conversación `PAID` + envío creado
- Idempotencia (orden ya pagada → `alreadyProcessed`)

## Notas

- El webhook no verifica la firma de MercadoPago (`x-signature` / `x-request-id`). Si se requiere mayor seguridad en producción, agregar validación de firma.
- Los pagos se hacen en moneda `MXN` (ver `server/payments/mercadopago.ts`).
- La orden se identifica por `external_reference`, que es el `id` de `PaymentOrder` generado al crear la orden de cobro.
