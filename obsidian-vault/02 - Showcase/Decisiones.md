# Decisiones

> Juicio técnico demostrado

## Decisión 1: WhatsApp con Baileys en lugar de la Cloud API

**Contexto:** la Cloud API de Meta tiene costo y proceso de verificación; Baileys usa WhatsApp Web sin ella.

**Decisión:** usar `@whiskeysockets/baileys` con sesión persistida en `auth_info/`.

**Justificación:** costo cero, control total y sin dependencia de aprobación de Meta. Con el trade-off de manejar reconexión y rotación de QR.

## Decisión 2: Monolito modular en lugar de microservicios

**Contexto:** un solo ingeniero a tiempo parcial.

**Decisión:** un repositorio con Next.js + custom server, separando módulos por carpetas.

**Justificación:** velocidad de desarrollo y despliegue simple; los módulos se pueden extraer después si hace falta.

## Decisión 3: Órdenes de cobro dentro del chat

**Contexto:** la venta ocurre en WhatsApp; sacar al cliente a un checkout separado fricciona.

**Decisión:** emitir `PaymentOrder` desde la conversación, con link de pago.

**Justificación:** reduce la fricción de cobro y mantiene el contexto de la venta.

## Decisión 4: Envíos configurables, sin carrier oficial

**Contexto:** cada cliente usa su propio courier o flota.

**Contexto:** modelar `Carrier` + `CarrierApiProvider` + `ShipmentEvent`, con conectores plug-in.

**Justificación:** el sistema se adapta a cada cliente en lugar de imponer uno.

## Decisión 5: Workers en proceso (setInterval) por ahora

**Contexto:** campañas y expiración necesitan ejecución periódica.

**Decisión:** `setInterval` en el custom server.

**Justificación:** simple y sin infraestructura extra; se migra a una cola cuando haya múltiples instancias.
