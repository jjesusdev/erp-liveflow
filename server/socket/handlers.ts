import type { Server, Socket } from 'socket.io';
import {
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppStatus,
} from '../whatsapp/client';

interface ChatLock {
  conversationId: string;
  socketId: string;
  operatorName: string;
  lockedAt: string;
  expiresAt: number; // Timestamp en ms para TTL automático
}

// Mapa en memoria para el bloqueo de conversaciones activas entre operadoras
const activeLocks = new Map<string, ChatLock>();
const LOCK_TTL_MS = 15 * 60 * 1000; // 15 minutos máximo si la ventana queda abierta sin actividad

// Limpiador periódico de locks expirados
setInterval(() => {
  const now = Date.now();
  for (const [convId, lock] of activeLocks.entries()) {
    if (now > lock.expiresAt) {
      activeLocks.delete(convId);
      // Emitir desbloqueo a todas las sesiones si el lock expiró
      const io = (globalThis as any).io;
      io?.emit('chat:unlocked', { conversationId: convId });
    }
  }
}, 30_000).unref?.();

/**
 * Handlers de socket compartidos: estado de WhatsApp y concurrencia/bloqueo de chats.
 */
export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.emit('whatsapp:status', getWhatsAppStatus());
    socket.emit('chat:locks:state', Array.from(activeLocks.values()));

    socket.on('whatsapp:status:request', () => {
      socket.emit('whatsapp:status', getWhatsAppStatus());
    });

    socket.on('whatsapp:connect', async () => {
      const status = await connectWhatsApp(io);
      socket.emit('whatsapp:status', status);
    });

    socket.on('whatsapp:disconnect', async () => {
      await disconnectWhatsApp();
      io.emit('whatsapp:status', getWhatsAppStatus());
    });

    // 🔒 CONCURRENCIA: Un operador abre y "toma" la conversación
    socket.on(
      'chat:lock',
      ({
        conversationId,
        operatorName,
      }: {
        conversationId: string;
        operatorName?: string;
      }) => {
        if (!conversationId) return;

        const lock: ChatLock = {
          conversationId,
          socketId: socket.id,
          operatorName: operatorName?.trim() || 'Vendedora',
          lockedAt: new Date().toISOString(),
          expiresAt: Date.now() + LOCK_TTL_MS,
        };

        activeLocks.set(conversationId, lock);
        io.emit('chat:locked', lock);
      }
    );

    // 🔓 CONCURRENCIA: Liberar conversación al cerrar el panel
    socket.on('chat:unlock', ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      const current = activeLocks.get(conversationId);
      if (current && current.socketId === socket.id) {
        activeLocks.delete(conversationId);
        io.emit('chat:unlocked', { conversationId });
      }
    });

    // Desconexión limpia: libera automáticamente los chats que esa operadora tenía abiertos
    socket.on('disconnect', () => {
      for (const [convId, lock] of activeLocks.entries()) {
        if (lock.socketId === socket.id) {
          activeLocks.delete(convId);
          io.emit('chat:unlocked', { conversationId: convId });
        }
      }
    });
  });
}
