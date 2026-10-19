import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket/handlers';
import { connectWhatsApp, getWhatsAppStatus } from './whatsapp/client';
import { processScheduledCampaigns } from '../src/lib/campaignSender';
import { processExpiredPaymentOrders } from '../src/lib/orderExpirationWorker';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: { origin: '*' },
    path: '/api/socketio',
  });

  (globalThis as any).io = io;

  registerSocketHandlers(io);

  const disableWhatsapp = process.env.DISABLE_WHATSAPP === 'true';
  const disableWorkers = process.env.DISABLE_WORKERS === 'true';

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);

    // Scheduler de campanas programadas: revisa cada minuto.
    if (!disableWorkers) {
      const campaignTimer = setInterval(() => {
        processScheduledCampaigns().catch((error) => {
          console.error('[campaigns] error en el scheduler:', error);
        });
      }, 60_000);
      campaignTimer.unref?.();

      // Worker de expiracion automatica de apartados de Live y liberacion de stock
      const expirationTimer = setInterval(() => {
        processExpiredPaymentOrders().catch((error) => {
          console.error('[expiration-worker] error en el timer:', error);
        });
      }, 45_000);
      expirationTimer.unref?.();
    } else {
      console.log('[workers] deshabilitados (DISABLE_WORKERS=true)');
    }

    // Conexion automatica de WhatsApp al arrancar. Si hay session guardada en
    // auth_info reconecta solo; si no, emite QR a la UI para escanear.
    if (disableWhatsapp) {
      console.log('[whatsapp] deshabilitado (DISABLE_WHATSAPP=true)');
      return;
    }

    connectWhatsApp(io)
      .then((status) => {
        console.log(
          `[whatsapp] estado inicial: ${
            status.connected ? 'conectado' : status.qr ? 'esperando QR' : 'desconectado'
          }`
        );
      })
      .catch((error) => {
        console.error('[whatsapp] fallo al iniciar:', error);
        io.emit('whatsapp:status', getWhatsAppStatus());
      });
  });
});
