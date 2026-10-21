# ERP LiveFlow

> Sistema ERP operativo para Live Shopping + WhatsApp.

## Demo

- 🌐 Live: pendiente
- 📸 Screenshots: [[02 - Showcase/Demo]]

## Stack

- Next.js 15 · React 19 · TypeScript · Tailwind CSS 3
- PostgreSQL + Prisma ORM
- Socket.io (tiempo real)
- Baileys (WhatsApp Web) + MercadoPago
- Docker Compose + PM2

## Features

- [x] Leads / Clientas con ficha 360
- [x] Chat de WhatsApp con workspace operativo
- [x] Órdenes de cobro express (MercadoPago / transferencia)
- [x] Envíos multi-carrier configurables
- [x] Difusiones (campañas) por WhatsApp
- [x] Caja & cuadre diario
- [x] Catálogo de prendas con stock
- [x] Reportes y métricas
- [x] Manual para vendedoras
- [x] Configuración de negocio, banco, bot y reglas live

## Instalación

```bash
git clone https://github.com/jjesusdev/erp-liveflow.git
cd erp-liveflow
npm install
cp .env.example .env   # editar DATABASE_URL y tokens
npm run db:push
npm run db:seed        # opcional, datos demo
npm run dev            # http://localhost:3001
```

## Licencia

Privada — Todos los derechos reservados.
