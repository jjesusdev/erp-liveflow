# Solución

> ¿Qué hace el ERP y cómo?

## Features

- **Workspace operativo**: inbox de conversaciones, chat, ficha 360 de la clienta y catálogo lateral.
- **Órdenes de cobro express**: se emiten desde el chat (MercadoPago/transferencia) con expiración automática.
- **WhatsApp integrado** vía Baileys (sin Cloud API), con plantillas y respuestas automáticas.
- **Envíos multi-carrier configurables**: courier externo, flota propia o retiro en tienda, con tracking y eventos.
- **Caja & cuadre**: ingresos/egresos, sweeps y cuadre diario.
- **Difusiones**: campañas masivas a clientas con estados de entrega/lectura.
- **Catálogo** de prendas con stock y reportes/métricas.
- **Tiempo real** con Socket.io entre WhatsApp, la UI y los operadores.

## Flujo principal

1. La clienta escribe por WhatsApp → se abre/actualiza su conversación y ficha.
2. La vendedora arma la orden y emite el cobro express.
3. El cliente paga → la orden pasa a `PAID` y se genera el envío.
4. Se despacha con el carrier configurado y se hace seguimiento.
5. Cierre del día: cuadre de caja y revisión de métricas.

## Diferencia competitiva

- Cobro **dentro del chat**, no en un checkout separado.
- **Multi-carrier configurable** sin asumir un cliente oficial.
- Diseño tipo cockpit, denso y rápido, pensado para operación en vivo.
- Multi-moneda (CLP/USD/EUR/ARS/MXN).
