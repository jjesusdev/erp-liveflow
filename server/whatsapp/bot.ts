import type { WASocket } from '@whiskeysockets/baileys';
import { prisma } from '../../src/lib/prisma';

function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function nowMinutesInTz(timezone?: string | null) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'America/Mexico_City',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  } catch {
    return null;
  }
}

export function isOutsideBusinessHours(config: {
  businessHoursStart?: string | null;
  businessHoursEnd?: string | null;
  timezone?: string | null;
}): boolean {
  const start = config.businessHoursStart
    ? minutesOf(config.businessHoursStart)
    : null;
  const end = config.businessHoursEnd ? minutesOf(config.businessHoursEnd) : null;
  if (start === null || end === null || start === end) return false;

  const now = nowMinutesInTz(config.timezone);
  if (now === null) return false;

  // Soporta horarios que cruzan la medianoche (ej. 18:00 - 02:00).
  if (start < end) return now < start || now > end;
  return now < start && now > end;
}

/**
 * Procesa palabras clave / triggers de Live Shopping (ej: "COMBO", "QUIERO", "INFO", "PRECIO", "APARTAR")
 * Si coincide con una plantilla o palabra clave preconfigurada, responde de inmediato.
 */
export async function processBotTriggers(
  sock: WASocket,
  phone: string,
  incomingText: string,
  conversationId: string
): Promise<boolean> {
  if (!incomingText || typeof incomingText !== 'string') return false;

  const normalized = incomingText.trim().toLowerCase();
  if (normalized.length === 0) return false;

  try {
    const templates = await prisma.messageTemplate.findMany({
      where: { isActive: true },
    });

    // Busca coincidencia por atajo/shortcut (ej: "combo", "quiero", "apartar") o en el nombre de plantilla
    const matched = templates.find((t) => {
      const shortcut = t.shortcut?.trim().toLowerCase().replace('/', '');
      if (shortcut && (normalized === shortcut || normalized.startsWith(shortcut + ' '))) {
        return true;
      }
      return false;
    });

    if (matched) {
      const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: matched.content });

      const created = await prisma.message.create({
        data: {
          conversationId,
          direction: 'OUTBOUND',
          type: 'TEXT',
          content: matched.content,
          isTemplate: true,
          templateId: matched.id,
          sentAt: new Date(),
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'ATTENTION',
          lastMessageAt: created.sentAt,
        },
      });

      const io = (globalThis as any).io;
      io?.emit('message:new', created);

      const full = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          lead: true,
          messages: { orderBy: { sentAt: 'desc' }, take: 1 },
          paymentOrders: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      if (full) io?.emit('conversation:updated', full);

      return true;
    }

    return false;
  } catch (error) {
    console.error('[bot] error evaluando triggers de Live:', error);
    return false;
  }
}

/**
 * Bienvenida / mensaje de ausencia. Se usa BusinessConfig (la config real del
 * negocio) y respeta autoReplyEnabled, autoReplyDelayMs y el horario.
 */
export async function sendWelcomeMessage(
  sock: WASocket,
  phone: string,
  conversationId?: string
) {
  try {
    const config = await prisma.businessConfig.findFirst();
    if (config && !config.autoReplyEnabled) return;

    const outside = config ? isOutsideBusinessHours(config) : false;
    const text =
      outside && config?.awayMessage
        ? config.awayMessage
        : config?.welcomeMessage ||
          '¡Hola! Bienvenido. Envíanos captura de lo que te gusta y te ayudamos enseguida.';

    if (!text) return;

    const delay = config?.autoReplyDelayMs ?? 1000;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });

    let convId = conversationId;
    if (!convId) {
      const conversation = await prisma.conversation.findFirst({
        where: { lead: { phone } },
        orderBy: { createdAt: 'desc' },
      });
      convId = conversation?.id;
    }
    if (!convId) return;

    const created = await prisma.message.create({
      data: {
        conversationId: convId,
        direction: 'OUTBOUND',
        type: 'TEXT',
        content: text,
        isTemplate: true,
        sentAt: new Date(),
      },
    });

    await prisma.conversation.update({
      where: { id: convId },
      data: { lastMessageAt: created.sentAt },
    });

    const io = (globalThis as any).io;
    io?.emit('message:new', created);
    const full = await prisma.conversation.findUnique({
      where: { id: convId },
      include: {
        lead: true,
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
        paymentOrders: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (full) io?.emit('conversation:updated', full);
  } catch (error) {
    console.error('[whatsapp] error enviando mensaje de bienvenida:', error);
  }
}
