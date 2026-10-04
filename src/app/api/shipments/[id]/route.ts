import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseEnum, SHIPMENT_STATUSES } from '@/lib/enums';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.shipment.findUnique({
      where: { id },
      include: { lead: true, paymentOrder: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Envio no encontrado' }, { status: 404 });
    }

    const data: any = {};
    let isStatusTransitionToInTransit = false;
    let isStatusTransitionToDelivered = false;

    if (body.status !== undefined) {
      const status = parseEnum(SHIPMENT_STATUSES, body.status);
      if (!status) {
        return NextResponse.json({ error: 'Estado invalido' }, { status: 400 });
      }
      data.status = status;

      if (status === 'IN_TRANSIT') {
        if (!existing.shippedAt) data.shippedAt = new Date();
        if (existing.status !== 'IN_TRANSIT') isStatusTransitionToInTransit = true;
      }
      if (status === 'DELIVERED') {
        data.deliveredAt = new Date();
        if (existing.status !== 'DELIVERED') isStatusTransitionToDelivered = true;
      }
    }

    if (body.trackingNumber !== undefined) {
      data.trackingNumber = body.trackingNumber || null;
    }
    if (body.carrier !== undefined) {
      data.carrier = body.carrier || null;
    }
    if (body.notes !== undefined) {
      data.notes = body.notes || null;
    }

    const shipment = await prisma.shipment.update({
      where: { id },
      data,
      include: {
        lead: true,
        paymentOrder: true,
      },
    });

    // Actualiza la conversación a SHIPPED si pasa a IN_TRANSIT o DELIVERED
    if (body.status === 'IN_TRANSIT' || body.status === 'DELIVERED') {
      await prisma.conversation.updateMany({
        where: {
          paymentOrders: { some: { shipment: { id } } },
          status: { in: ['PAID', 'ATTENTION', 'AWAITING_PAYMENT'] },
        },
        data: { status: 'SHIPPED' },
      });
    }

    // Notificación inteligente por WhatsApp al despachar (IN_TRANSIT)
    if (isStatusTransitionToInTransit && body.notifyCustomer !== false) {
      const client = (global as any).whatsappClient;
      if (client && shipment.lead?.phone) {
        try {
          const jid = `${shipment.lead.phone.replace(/\D/g, '')}@s.whatsapp.net`;
          const concept = shipment.paymentOrder?.concept || 'Tu pedido';
          const carrier = shipment.carrier || 'mensajería local';
          const tracking = shipment.trackingNumber;
          const notes = shipment.notes;

          let dispatchMessage = `📦 ¡Buenas noticias! Tu paquete de "${concept}" va en camino.\n\n🚚 *Método de entrega:* ${carrier}`;

          if (tracking) {
            dispatchMessage += `\n🔖 *Número de guía / rastreo:* ${tracking}`;
          }

          if (notes) {
            dispatchMessage += `\n📝 *Detalles de entrega:* ${notes}`;
          }

          dispatchMessage += `\n\n¡Gracias por tu compra en nuestro Live Shopping! ✨`;

          await client.sendMessage(jid, { text: dispatchMessage });

          // Si hay una conversación asociada, guardamos el mensaje en el chat
          if (shipment.paymentOrder?.conversationId) {
            const savedMsg = await prisma.message.create({
              data: {
                conversationId: shipment.paymentOrder.conversationId,
                direction: 'OUTBOUND',
                type: 'TEXT',
                content: dispatchMessage,
                sentAt: new Date(),
              },
            });

            const io = (global as any).io;
            if (io) {
              io.emit('message:new', savedMsg);
            }
          }
        } catch (error) {
          console.error('Error enviando notificación de despacho por WhatsApp:', error);
        }
      }
    }

    const io = (global as any).io;
    if (io) {
      io.emit('shipment:updated', shipment);
    }

    return NextResponse.json(shipment);
  } catch (error) {
    console.error('Error updating shipment:', error);
    return NextResponse.json({ error: 'Error updating shipment' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.shipment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Envio no encontrado' }, { status: 404 });
    }

    await prisma.shipment.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting shipment:', error);
    return NextResponse.json({ error: 'Error deleting shipment' }, { status: 500 });
  }
}