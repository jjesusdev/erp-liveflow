# Visión del producto — ERP LiveFlow

## Qué es

Plataforma operativa que conecta **transmisiones de Live Shopping** (TikTok, Instagram, YouTube Live) con **WhatsApp** para que un equipo de vendedoras (o una sola persona) atienda clientas, emita **órdenes de cobro express**, despache pedidos y cuadre la caja, todo en un solo lugar.

## Para quién

- **Negocios de venta en vivo** (moda/prendas, belleza, deco) que venden por streaming y cierran por WhatsApp.
- **Un solo operador o un equipo pequeño**: la prioridad es velocidad de atención, no features enterprise.
- Configurable por cliente: cada empresa conecta su propio courier, banco y métodos de pago.

## Problema

- La venta en vivo genera demanda explosiva y efímera; atender por WhatsApp manual es lento y se pierden ventas.
- La cobranza depende de links externos y de llevar el control en papel/hojas.
- El envío y el cuadre de caja quedan desconectados del chat donde nació la venta.

## Solución

Un CRM operativo donde:

1. La clienta escribe por WhatsApp → se abre una conversación con su ficha.
2. La vendedora emite una **orden de cobro express** (MercadoPago/transferencia) sin inventario estricto.
3. Se despacha el pedido con **carriers configurables** y se hace seguimiento.
4. Se cierra el día con **cuadre de caja** y métricas.

## Diferenciadores

- **Cobro al vuelo dentro del chat** (no un checkout separado).
- **Multi-carrier configurable** (courier externo, flota propia, retiro en tienda).
- **Tiempo real** (Socket.io) entre WhatsApp, la UI y los operadores.
- **Multi-moneda** (CLP/USD/EUR/ARS/MXN) y datos demo chilenos/mexicanos.
- Diseño tipo "cockpit" oscuro, denso y rápido.

## Alcance (v1)

Incluido: leads, chat/WhatsApp, órdenes de pago, envíos multi-carrier, campañas, caja/cuadre, catálogo, reportes, manual, configuración.

Fuera de alcance (por ahora): multi-tenant real, pasarela de pago propia, app móvil, contabilidad completa, logística con propias flotas operativas (solo configuración).

## Métricas objetivo

- Tiempo de primera respuesta en conversaciones.
- Conversión de orden de cobro (creadas → pagadas).
- Tasa de entrega y de incidencias en envíos.
- Cuadre de caja diario sin descuadres.

## Principios

1. Velocidad de atención sobre features.
2. Configurable, no rígido (carriers, pagos, moneda).
3. Sin sobre-ingeniería: tiempo parcial, una persona.
4. Datos existentes primero (migraciones no destructivas).
