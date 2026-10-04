import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
  type WAMessage,
} from '@whiskeysockets/baileys';
import type { Server } from 'socket.io';
import fs from 'fs';
import qrcodeTerminal from 'qrcode-terminal';
import { prisma } from '../../src/lib/prisma';
import { sendWelcomeMessage } from './bot';
import { handleIncomingMessage } from './handlers/messages';
import { handleMediaMessage } from './handlers/media';

const AUTH_DIR = 'auth_info';

let waSocket: WASocket | null = null;
let ioRef: Server | null = null;
let connected = false;
let connecting = false;
let manualDisconnect = false;
let currentQr: string | null = null;
let lastPrintedQr: string | null = null;
let reconnectAttempts = 0;
let reconnectTimer: NodeJS.Timeout | null = null;

export function getWhatsAppStatus() {
  return { connected, connecting, qr: manualDisconnect ? null : currentQr };
}

export function getWhatsAppClient(): WASocket | null {
  return connected ? waSocket : null;
}

function broadcast(io?: Server) {
  (io || ioRef)?.emit('whatsapp:status', { connected, connecting });
}

function clearAuthDir() {
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch {
    // El directorio puede no existir todavia.
  }
}

function scheduleReconnect() {
  if (manualDisconnect || reconnectTimer) return;
  reconnectAttempts += 1;
  const delay = Math.min(30_000, 3_000 * reconnectAttempts);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (manualDisconnect || connected || !ioRef) return;
    console.log(`[whatsapp] reconectando (intento ${reconnectAttempts})...`);
    await connectWhatsApp(ioRef);
  }, delay);
}

export async function connectWhatsApp(io: Server) {
  ioRef = io;

  if (connected || connecting) {
    broadcast();
    return getWhatsAppStatus();
  }

  manualDisconnect = false;
  connecting = true;
  currentQr = null;
  broadcast();

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const sock = makeWASocket({
      auth: state,
      browser: ['ERP Live Shopping', 'Chrome', '1.22.10'],
    });
    waSocket = sock;

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => handleConnectionUpdate(sock, update));
    sock.ev.on('messages.upsert', (upsert) => {
      void handleUpsert(sock, upsert.messages || []);
    });
  } catch (error) {
    console.error('[whatsapp] error iniciando sesion:', error);
    connecting = false;
    broadcast();
  }

  return getWhatsAppStatus();
}

function handleConnectionUpdate(sock: WASocket, update: any) {
  if (update.qr && !manualDisconnect) {
    const qr: string = update.qr;
    currentQr = qr;
    if (qr !== lastPrintedQr) {
      lastPrintedQr = qr;
      try {
        console.log('[whatsapp] Escanea el QR con tu telefono:');
        qrcodeTerminal.generate(qr, { small: true });
      } catch {
        // Si falla la impresion en terminal el QR igual va por socket a la UI.
      }
    }
    ioRef?.emit('whatsapp:qr', { qr });
    broadcast();
  }

  if (update.connection === 'open') {
    connected = true;
    connecting = false;
    currentQr = null;
    lastPrintedQr = null;
    reconnectAttempts = 0;
    (globalThis as any).whatsappClient = sock;
    console.log('[whatsapp] conectado');
    ioRef?.emit('whatsapp:qr', { qr: null });
    broadcast();
  }

  if (update.connection === 'close') {
    connected = false;
    connecting = false;
    if ((globalThis as any).whatsappClient === sock) {
      (globalThis as any).whatsappClient = null;
    }

    const statusCode = (update.lastDisconnect?.error as any)?.output?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;

    if (manualDisconnect || loggedOut) {
      currentQr = null;
      lastPrintedQr = null;
      if (loggedOut && !manualDisconnect) {
        // La sesion quedo invalida: limpiar para forzar un QR nuevo.
        clearAuthDir();
      }
      broadcast();
      return;
    }

    broadcast();
    scheduleReconnect();
  }
}

export async function disconnectWhatsApp() {
  manualDisconnect = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const sock = waSocket;
  waSocket = null;
  connected = false;
  connecting = false;
  currentQr = null;
  lastPrintedQr = null;
  (globalThis as any).whatsappClient = null;

  try {
    await sock?.logout();
  } catch {
    // El socket puede haberse caido antes del logout.
  }

  clearAuthDir();
  ioRef?.emit('whatsapp:qr', { qr: null });
  broadcast();
}

async function persistConversation(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      lead: true,
      messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      paymentOrders: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
}

async function handleUpsert(sock: WASocket, messages: WAMessage[]) {
  for (const raw of messages) {
    try {
      if (raw.key.fromMe) continue;

      const jid = raw.key.remoteJid;
      if (!jid || !jid.endsWith('@s.whatsapp.net')) continue;

      const msg = raw.message;
      if (!msg) continue;

      const phone = jid.replace('@s.whatsapp.net', '').split(':')[0];
      const msgId = raw.key.id ?? null;

      if (msgId) {
        const existing = await prisma.message.findFirst({
          where: { whatsappMsgId: msgId },
          select: { id: true },
        });
        if (existing) continue;
      }

      let lead = await prisma.lead.findUnique({ where: { phone } });
      if (!lead) {
        lead = await prisma.lead.create({ data: { phone, source: 'whatsapp' } });
      }

      let conversation = await prisma.conversation.findFirst({
        where: {
          leadId: lead.id,
          status: { in: ['NEW', 'ATTENTION', 'AWAITING_PAYMENT'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      let isNewConversation = false;
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { leadId: lead.id, status: 'NEW' },
        });
        isNewConversation = true;
      }

      let created = null;
      if (msg.imageMessage || msg.videoMessage) {
        created = await handleMediaMessage(sock, raw, conversation.id, phone);
      } else if (msg.conversation || msg.extendedTextMessage) {
        created = await handleIncomingMessage(raw, conversation.id, phone);
      } else {
        // Tipos no soportados (stickers, reacciones, notas de voz): ignorar.
        continue;
      }

      if (!created) continue;

      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastInteractionAt: new Date() },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: created.sentAt },
      });

      const io = ioRef;
      if (created) {
        let isPossibleReceipt = false;
        let pendingOrder: any = null;

        if (created.type === 'IMAGE') {
          // Si la conversación está en AWAITING_PAYMENT o tiene órdenes pendientes/enviadas
          const pendingPayment = await prisma.paymentOrder.findFirst({
            where: {
              conversationId: conversation.id,
              status: { in: ['PENDING', 'SENT'] },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (conversation.status === 'AWAITING_PAYMENT' || pendingPayment) {
            isPossibleReceipt = true;
            pendingOrder = pendingPayment;
          }
        }

        const messagePayload = {
          ...created,
          isPossibleReceipt,
          pendingPaymentOrderId: pendingOrder?.id || null,
        };

        io?.emit('message:new', messagePayload);
      }
      const full = await persistConversation(conversation.id);
      if (full) io?.emit('conversation:updated', full);

      if (isNewConversation) {
        void sendWelcomeMessage(sock, phone, conversation.id);
      } else if (created.type === 'TEXT' && created.content) {
        // Evaluar disparadores rápidos / palabras clave de Live Shopping si no es conversación nueva
        const { processBotTriggers } = await import('./bot');
        void processBotTriggers(sock, phone, created.content, conversation.id);
      }
    } catch (error) {
      console.error('[whatsapp] error procesando mensaje entrante:', error);
    }
  }
}
