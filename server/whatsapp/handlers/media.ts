import type { WASocket } from '@whiskeysockets/baileys';
import type { Message as PrismaMessage } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';

/**
 * Descarga y persiste un mensaje multimedia entrante (imagen/video/audio).
 * Límite seguro para comprobantes de pago e imágenes de Live.
 */
const MAX_MEDIA_BYTES = 5 * 1024 * 1024; // 5 MB

export async function handleMediaMessage(
  sock: WASocket,
  message: any,
  conversationId: string,
  phone: string
): Promise<PrismaMessage | null> {
  const imageMsg = message.message?.imageMessage;
  const videoMsg = message.message?.videoMessage;
  const audioMsg = message.message?.audioMessage;
  const media = imageMsg || videoMsg || audioMsg;
  if (!media) return null;

  let type: 'IMAGE' | 'VIDEO' | 'AUDIO' = 'IMAGE';
  if (videoMsg) type = 'VIDEO';
  if (audioMsg) type = 'AUDIO';

  const caption: string = media.caption || '';
  let mediaUrl: string | null = null;
  const mimetype: string = media.mimetype || (audioMsg ? 'audio/ogg; codecs=opus' : 'image/jpeg');

  try {
    const buffer = await (sock as any).downloadMediaMessage(message, 'buffer', {});
    if (buffer && buffer.length <= MAX_MEDIA_BYTES) {
      const base64 = Buffer.from(buffer).toString('base64');
      mediaUrl = `data:${mimetype};base64,${base64}`;
    }
  } catch (error) {
    console.error('[whatsapp] error descargando media:', error);
  }

  return prisma.message.create({
    data: {
      conversationId,
      direction: 'INBOUND',
      type,
      content: caption || (type === 'AUDIO' ? 'Nota de voz recibida' : null),
      mediaUrl,
      mediaType: mimetype,
      whatsappMsgId: message.key?.id,
      fromPhone: phone,
    },
  });
}