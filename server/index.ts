import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket/handlers";
import { connectWhatsApp, getWhatsAppStatus } from "./whatsapp/client";
import { processScheduledCampaigns } from "../src/lib/campaignSender";
import { processExpiredPaymentOrders } from "../src/lib/orderExpirationWorker";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3001", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/**
 * Inicializa la base de datos si es necesario (para planes gratuitos sin post-deploy hooks).
 * Cread: tabla Organization, usuarios demo.
 */
async function initializeDatabase() {
  console.log("[init] Verificando base de datos...");

  // Usar db push como método más confiable que migrate deploy
  // db push sincroniza el schema con la BD sin migraciones versionadas
  try {
    const { execSync } = require("child_process");

    console.log("[init] Ejecutando prisma db push...");
    execSync("npx prisma db push", {
      stdio: "inherit",
      env: { ...process.env },
    });
    console.log("[init] Database sincronizada");
  } catch (error: any) {
    console.error("[init] Error en db push:", error.message);
    // Continuar igual - el servidor puede arrancar con BD parcial
  }

  // Crear/usar organización demo
  try {
    const org = await prisma.organization.upsert({
      where: { slug: "demo" },
      update: { name: "Demo LiveFlow", isActive: true, settings: {} },
      create: {
        name: "Demo LiveFlow",
        slug: "demo",
        isActive: true,
        settings: {},
      },
    });

    // Crear usuarios demo
    const adminPasswordHash = await hashPassword("admin123");

    await prisma.operator.upsert({
      where: { email: "admin@erp.local" },
      update: {
        name: "Administrador",
        role: "ADMIN",
        orgId: org.id,
        passwordHash: adminPasswordHash,
        isOnline: true,
      },
      create: {
        name: "Administrador",
        email: "admin@erp.local",
        role: "ADMIN",
        orgId: org.id,
        passwordHash: adminPasswordHash,
        isOnline: true,
      },
    });

    console.log("[init] Usuario demo admin@erp.local listo");
  } catch (error: any) {
    console.error("[init] Error inicializando usuarios demo:", error.message);
  }
}

app.prepare().then(() => {
  // Inicializar base de datos ANTES de crear el servidor
  initializeDatabase()
    .catch((err) => {
      console.error("[init] Error en inicialización:", err);
    })
    .then(() => {
      const httpServer = createServer((req, res) => {
        handle(req, res);
      });

      const io = new Server(httpServer, {
        cors: { origin: "*" },
        path: "/api/socketio",
      });

      (globalThis as any).io = io;

      registerSocketHandlers(io);

      const disableWhatsapp = process.env.DISABLE_WHATSAPP === "true";
      const disableWorkers = process.env.DISABLE_WORKERS === "true";

      httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);

        // Scheduler de campanas programadas: revisa cada minuto.
        if (!disableWorkers) {
          const campaignTimer = setInterval(() => {
            processScheduledCampaigns().catch((error) => {
              console.error("[campaigns] error en el scheduler:", error);
            });
          }, 60_000);
          campaignTimer.unref?.();

          // Worker de expiracion automatica de apartados de Live y liberacion de stock
          const expirationTimer = setInterval(() => {
            processExpiredPaymentOrders().catch((error) => {
              console.error("[expiration-worker] error en el timer:", error);
            });
          }, 45_000);
          expirationTimer.unref?.();
        } else {
          console.log("[workers] deshabilitados (DISABLE_WORKERS=true)");
        }

        // Conexion automatica de WhatsApp al arrancar. Si hay session guardada en
        // auth_info reconecta solo; si no, emite QR a la UI para escanear.
        if (disableWhatsapp) {
          console.log("[whatsapp] deshabilitado (DISABLE_WHATSAPP=true)");
          return;
        }

        connectWhatsApp(io)
          .then((status) => {
            console.log(
              `[whatsapp] estado inicial: ${
                status.connected ? "conectado" : status.qr ? "esperando QR" : "desconectado"
              }`
            );
          })
          .catch((error) => {
            console.error("[whatsapp] fallo al iniciar:", error);
            io.emit("whatsapp:status", getWhatsAppStatus());
          });
      });
    });
});
