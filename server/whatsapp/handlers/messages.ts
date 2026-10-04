import type { Message as PrismaMessage } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';

/**
 * Persiste un mensaje de texto entrante. Devuelve el registro creado para que
 * el caller lo emita por socket.
 */
export async function handleIncomingMessage(
  message: any,
  conversationId: string,
  phone: string
): Promise<PrismaMessage> {
  const text =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    '';

  return prisma.message.create({
    data: {
      conversationId,
      direction: 'INBOUND',
      type: 'TEXT',
      content: text,
      whatsappMsgId: message.key?.id,
      fromPhone: phone,
    },
  });
}
