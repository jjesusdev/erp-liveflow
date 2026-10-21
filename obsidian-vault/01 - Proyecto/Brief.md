# Brief del Proyecto — ERP LiveFlow

> Sistema ERP operativo para **Live Shopping + WhatsApp** — misión, alcance y principios.

## Qué es

**LiveFlow CRM** es una plataforma operativa para transmisiones de **Live Shopping** (TikTok, Instagram, YouTube Live) integrada a **WhatsApp** que emite **órdenes de cobro express** al vuelo, sin depender de inventario estricto. Atiende clientas por chat, cobra (MercadoPago/transferencia), despacha pedidos y cuadra la caja.

## Para quién

- Negocios de venta en vivo (moda/prendas, belleza, deco) que venden por streaming y cierran por WhatsApp.
- Un solo operador o equipo pequeño: prioridad en velocidad de atención.
- Configurable por cliente: cada empresa conecta su courier, banco y métodos de pago.

## Stack

| Capa          | Tecnología                                        |
| ------------- | ------------------------------------------------- |
| Frontend      | Next.js 15, React 19, TypeScript, Tailwind CSS 3  |
| Backend       | Next.js API Routes + custom server (Express/Node) |
| Base de datos | PostgreSQL + Prisma ORM                           |
| Tiempo real   | Socket.io                                         |
| WhatsApp      | Baileys (WhatsApp Web, sin Cloud API)             |
| Pagos         | MercadoPago + transferencia bancaria              |
| UI            | Radix UI, Base UI, lucide-react, sonner           |
| Infra         | Docker Compose, PM2                               |

## Principios

1. **Velocidad de atención** sobre features.
2. **Configurable**, no rígido (carriers, pagos, moneda).
3. **Sin sobre-ingeniería** (tiempo parcial, una persona).
4. **Datos existentes primero** (migraciones no destructivas).

## Módulos

Dashboard Live · Monitor Live HUD · Caja & Cuadre · Clientas · Prendas/Catálogo · Envíos & Reparto · Difusiones WhatsApp · Reportes · Manual · Configuración.

Ver [[_Índice de Módulos]].

## Estado

| Fase                       | Estado |
| -------------------------- | ------ |
| Setup y cerebro            | 🟢     |
| Fundamentos                | 🟢     |
| Operación en vivo          | 🟢     |
| Escala y configuración     | 🟡     |
| Conectores e integraciones | 🟡     |
| Multi-tenant y producción  | 🟢     |

## Links

- [[README]] · [[02 - Showcase/_Índice de Showcase]] · [[05 - Arquitectura/_Índice de Arquitectura]] · [[07 - Sesiones/_Índice de Sesiones]]
