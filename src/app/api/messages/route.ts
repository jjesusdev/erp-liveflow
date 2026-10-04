import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'asc' },
    });

    // Enriquecemos los mensajes con bandera si son imágenes y hay órdenes pendientes
    const pendingPayment = await prisma.paymentOrder.findFirst({
      where: {
        conversationId,
        status: { in: ['PENDING', 'SENT'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { status: true },
    });

    const isAwaiting = conversation?.status === 'AWAITING_PAYMENT' || Boolean(pendingPayment);

    const enriched = messages.map((m) => ({
      ...m,
      isPossibleReceipt: m.type === 'IMAGE' && m.direction === 'INBOUND' && isAwaiting,
      pendingPaymentOrderId: pendingPayment?.id || null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Error fetching messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, content, mediaUrl, mediaType = 'image/jpeg', type = 'TEXT' } = body;

    if (!conversationId || (!content?.trim() && !mediaUrl)) {
      return NextResponse.json(
        { error: 'Faltan datos del mensaje' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { lead: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversacion no encontrada' },
        { status: 404 }
      );
    }

    const client = (global as any).whatsappClient;
    let whatsappMsgId: string | null = null;
    let delivered = false;

    if (client) {
      try {
        const jid = `${conversation.lead.phone.replace(/\D/g, '')}@s.whatsapp.net`;
        if (type === 'IMAGE' && mediaUrl) {
          // Envío de imagen por Baileys (URL o Base64 Data URL)
          const isBase64 = mediaUrl.startsWith('data:image');
          const buffer = isBase64
            ? Buffer.from(mediaUrl.split(',')[1], 'base64')
            : { url: mediaUrl };

          const sent = await client.sendMessage(jid, {
            image: buffer,
            caption: content || undefined,
          });
          whatsappMsgId = sent?.key?.id ?? null;
          delivered = true;
        } else {
          const sent = await client.sendMessage(jid, { text: content });
          whatsappMsgId = sent?.key?.id ?? null;
          delivered = true;
        }
      } catch (error) {
        console.error('Error enviando mensaje por WhatsApp:', error);
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        type: type === 'IMAGE' ? 'IMAGE' : 'TEXT',
        content: content || null,
        mediaUrl: mediaUrl || null,
        mediaType: type === 'IMAGE' ? mediaType : null,
        whatsappMsgId,
        sentAt: new Date(),
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: message.sentAt,
        status:
          conversation.status === 'NEW' ? 'ATTENTION' : conversation.status,
      },
    });

    const io = (global as any).io;
    if (io) {
      io.emit('message:new', message);
      io.emit('conversation:updated', {
        id: conversationId,
        lastMessageAt: message.sentAt,
      });
    }

    return NextResponse.json({ ...message, delivered });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Error creating message' }, { status: 500 });
  }
}