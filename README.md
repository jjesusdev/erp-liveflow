# LiveFlow CRM — Express Sales for Live Shopping & WhatsApp

[![Stack](https://img.shields.io/badge/Stack-Next.js%2015%20%7C%20TypeScript-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20Prisma-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Realtime](https://img.shields.io/badge/Realtime-Socket.io%20%2B%20Baileys-DC382D?style=for-the-badge&logo=socketdotio)](https://socket.io/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Baileys%20Web-25D366?style=for-the-badge&logo=whatsapp)](https://github.com/WhiskeySockets/Baileys)

---

## Vision General

**LiveFlow CRM** es una plataforma operativa disenada para transmisiones de **Live Shopping** (TikTok, Instagram, YouTube Live) integrada a WhatsApp para emitir **ordenes de cobro express al vuelo** sin depender de inventario estricto.

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 3 |
| Backend | Next.js API Routes, Express (custom server) |
| Base de datos | PostgreSQL + Prisma ORM |
| Tiempo real | Socket.io (WebSocket) |
| WhatsApp | Baileys (WhatsApp Web, sin Cloud API) |
| Pagos | MercadoPago + Transferencia bancaria directa |
| UI | Radix UI, Base UI, lucide-react, sonner |
| Tipografia | SF Pro (Apple) / Inter (fallback cross-platform) |

---

## Requisitos Previos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

---

## Instalacion

```bash
# 1. Clonar
git clone git@github.com:jjesusdev/erp-liveflow.git
cd erp-liveflow

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL

# 4. Crear schema de base de datos
npm run db:push

# 5. (Opcional) Seed de datos demo
npm run db:seed

# 6. Iniciar en desarrollo (puerto 3001)
npm run dev
```

Abrir [http://localhost:3001](http://localhost:3001).

---

## Scripts Disponibles

| Script | Descripcion |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo (puerto 3001) |
| `npm run build` | Build de produccion |
| `npm run start` | Servidor de produccion |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint con auto-fix |
| `npm run format` | Prettier formateo |
| `npm run typecheck` | TypeScript type-check |
| `npm run db:push` | Sincronizar schema con BD |
| `npm run db:seed` | Poblar datos demo |
| `npm run db:studio` | Prisma Studio |

---

## Estructura del Proyecto

```
erp-liveflow/
├── prisma/              # Schema Prisma + seed
├── server/              # Custom server (Express + Socket.io + Baileys)
│   ├── index.ts         # Entry point
│   ├── socket/          # WebSocket handlers
│   └── whatsapp/        # Baileys connection + bot
├── src/
│   ├── app/             # Next.js App Router (pages + API routes)
│   ├── components/      # React components
│   │   ├── ui/          # Primitivos (button, dialog, tabs...)
│   │   ├── liveflow/    # Design system (workspace, nav, primitives)
│   │   ├── chat/        # Chat panel descompuesto
│   │   ├── caja/        # Cuadre de caja
│   │   ├── config/      # Configuracion del sistema
│   │   ├── leads/       # Directorio de clientas
│   │   └── shipments/   # Logistica y envios
│   ├── hooks/           # Custom hooks (useCaja, useLeads, useShipments, useChatPanel)
│   ├── lib/             # Utilidades (socket, prisma, format, audit)
│   └── types/           # Tipos TypeScript compartidos
├── diseno-live-flow-crm/ # UI de referencia (excluida de build)
└── ObsidianVault/       # Documentacion del proyecto
```

---

## Documentacion en Obsidian

Toda la arquitectura, decisiones de diseno y modelo de datos estan sincronizados en la boveda de Obsidian:

- Ruta: `C:\Users\Admin\Documents\ObsidianVault`
- Enlace maestro: `LiveFlow CRM.md`

---

## Licencia

Privada — Todos los derechos reservados.
