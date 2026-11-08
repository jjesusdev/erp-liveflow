# Recordatorios Automáticos de Órdenes de Pago

> Documenta cómo funcionan los recordatorios automáticos, cómo configurarlos y cómo probarlos.

## Overview

Los recordatorios automáticos notifican a clientas con órdenes de pago pendientes o próximas a expirar. Estos recordatorios pueden enviarse automáticamente o manualmente por parte del operador.

## Configuración

La configuración se guarda en `Organization.settings` y se accede desde la sección "Recordatorios" del panel de configuración.

### Variables de configuración

| Variable                | Tipo      | Por defecto | Descripción                                             |
| ----------------------- | --------- | ----------- | ------------------------------------------------------- |
| `reminderEnabled`       | `boolean` | `false`     | Activa/desactiva los recordatorios automáticos          |
| `reminderBeforeMinutes` | `number`  | `15`        | Minutos antes de la expiración para enviar recordatorio |
| `reminderDays`          | `number`  | `7`         | Días de ventana para recordatorios (pendiente de usar)  |

## Endpoints API

### GET /api/caja/reminders

Obtiene información sobre órdenes pendientes que podrían recibir recordatorios.

**Respuesta (activado):**

```json
{
  "enabled": true,
  "pendingCount": 3,
  "settings": {
    "reminderBeforeMinutes": 15,
    "reminderDays": 7
  }
}
```

**Respuesta (desactivado):**

```json
{
  "enabled": false,
  "message": "Los recordatorios automáticos están desactivados",
  "settings": {
    "reminderBeforeMinutes": 15
  }
}
```

### POST /api/caja/reminders

Envía recordatorios manualmente a órdenes pendientes.

**Body:**

```json
{
  "reminderType": "PENDING_ONLY" | "EXPIRED_ONLY" | "ALL_PRIOR",
  "customMessage": "Mensaje personalizado o null",
  "dryRun": true | false
}
```

**Respuesta:**

```json
{
  "success": true,
  "sentCount": 2,
  "totalPending": 5,
  "details": [{ "orderId": "uuid", "leadPhone": "5512345678", "status": "PENDING" }]
}
```

## Flujo de funcionamiento

### Recordatorios automáticos

1. El worker revisa cada minuto si los recordatorios están habilitados
2. Busca órdenes con `status: PENDING` o `status: SENT` que expiren entre:
   - Ahora
   - Ahora + 24 horas
3. Solo envía recordatorios a órdenes que no hayan recibido recordatorio en los últimos `reminderBeforeMinutes`
4. Envía el mensaje por WhatsApp con información del apartado

### Mensaje de recordatorio

```
¡Hola {nombre}! Te recordamos tu apartado "{concepto}" por ${monto} {moneda} (Ref: {ref}).
Tu apartado expirará en aproximadamente {minutos} minutos.
Si aún deseas tu pedido, por favor confírmalo para que podamos reservar las prendas. 🙏
```

### Recordatorios manuales

Desde la UI de Configuración → pestaña "Recordatorios":

1. Verificar cuántas órdenes pendientes hay
2. Hacer clic en "Modo prueba" para ver cuántas se identificarían
3. Hacer clic en "Enviar recordatorios" para enviar en vivo

## Worker de recordatorios

El worker `processPaymentReminders` en `src/lib/reminderWorker.ts`:

1. **Verifica habilitación**: Si `reminderEnabled` es false, retorna vacío
2. **Calcula ventana**: Busca órdenes que expiren en las próximas 24 horas
3. **Filtra por tiempo**: Excluye órdenes donde ya se envió recordatorio recientemente
4. **Construye mensaje**: Usa plantilla dinámica o mensaje personalizado
5. **Envía por WhatsApp**: Registra el mensaje en la base de datos
6. **Audita**: Registra la actividad en `ActivityLog`

## Seguridad y idempotencia

- Los recordatorios no se envían a órdenes `PAID` o `CANCELLED`
- El campo `sentAt` evita enviar recordatorios duplicados
- Los mensajes se registran en `Message` con `direction: OUTBOUND` y `type: TEXT`
- Los errores de envío se registran en consola y continúan con las siguientes órdenes

## Testing

### Tests de integración

Ubicados en: `src/app/api/caja/reminders/__tests__/reminders.integration.test.ts`

```bash
# Ejecutar sin BD (pruebas que no requieren BD)
npm run test

# Ejecutar con BD (tests completos)
TEST_DB=1 npm test
```

### Casos cubiertos

- GET devuelve estado correcto según configuración
- POST con dryRun no envía mensajes
- POST con customMessage usa el mensaje personalizado
- POST con diferentes tipos de recordatorios (PENDING_ONLY, EXPIRED_ONLY, ALL_PRIOR)

## Notas importantes

- Los recordatorios requieren que el cliente de WhatsApp esté conectado
- Las órdenes expiradas automáticamente se procesan por el worker de expiración (`orderExpirationWorker.ts`), no por los recordatorios
- Para cambios en la lógica de recordatorios, modificar `reminderWorker.ts`
- Los eventos se emiten por Socket.io como `reminders:processed`
