import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveOperatorId } from '@/lib/operator';
import { parseEnum, PAYMENT_STATUSES } from '@/lib/enums';
import { logActivity } from '@/lib/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.paymentOrder.findUnique({
      where: { id },
      include: { lead: true, conversation: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 });
    }

    const data: any = {};
    let isStatusPaidTransition = false;

    if (body.status !== undefined) {
      const status = parseEnum(PAYMENT_STATUSES, body.status);
      if (!status) {
        return NextResponse.json({ error: 'Estado invalido' }, { status: 400 });
      }
      data.status = status;
      if (status === 'PAID') {
        data.paidAt = new Date();
        if (existing.status !== 'PAID') {
          isStatusPaidTransition = true;
        }
      } else {
        data.paidAt = existing.paidAt;
      }
    }

    if (body.concept !== undefined) data.concept = body.concept;
    if (body.amount !== undefined && body.amount !== null && body.amount !== '') {
      const numeric = Number(body.amount);
      if (Number.isNaN(numeric) || numeric < 0) {
        return NextResponse.json({ error: 'Monto invalido' }, { status: 400 });
      }
      data.amount = numeric;
    }

    // Ejecutar mutaciones críticas en una transacción atómica
    const [paymentOrder, updatedConv, createdShipment] = await prisma.$transaction(
      async (tx) => {
        const order = await tx.paymentOrder.update({
          where: { id },
          data,
          include: { lead: true, conversation: true },
        });

        let conv = null;
        let ship = null;

        if (data.status === 'PAID') {
          conv = await tx.conversation.update({
            where: { id: order.conversationId },
            data: { status: 'PAID' },
            include: {
              lead: true,
              messages: { orderBy: { sentAt: 'desc' }, take: 1 },
              paymentOrders: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          });

          const existingShipment = await tx.shipment.findUnique({
            where: { paymentOrderId: order.id },
          });

          if (!existingShipment) {
            ship = await tx.shipment.create({
              data: {
                paymentOrderId: order.id,
                leadId: order.leadId,
                status: 'PENDING',
              },
              include: {
                lead: true,
                paymentOrder: true,
              },
            });
          } else {
            ship = existingShipment;
          }
        }

        return [order, conv, ship];
      }
    );

    // Registrar en auditoría
    await logActivity({
      action: data.status === 'PAID' ? 'PAYMENT_APPROVED' : 'PAYMENT_UPDATED',
      conversationId: paymentOrder.conversationId,
      details: {
        orderId: paymentOrder.id,
        amount: Number(paymentOrder.amount),
        previousStatus: existing.status,
        newStatus: data.status || existing.status,
      },
    });

    if (data.status === 'PAID') {
      // Envío de mensaje automático de confirmación por WhatsApp si global.whatsappClient está disponible
      const client = (global as any).whatsappClient;
      if (client && paymentOrder.lead?.phone) {
        try {
          const jid = `${paymentOrder.lead.phone.replace(/\D/g, '')}@s.whatsapp.net`;
          const currency = paymentOrder.currency || 'MXN';
          const formattedAmount = Number(paymentOrder.amount).toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const confirmMsg = `🎉 ¡Pago confirmado con éxito! Tu pedido '${paymentOrder.concept}' por $${formattedAmount} ${currency} ha sido recibido y está siendo preparado para envío. Te notificaremos tu número de guía en cuanto esté listo.`;

          await client.sendMessage(jid, { text: confirmMsg });

          // Guardamos el mensaje en el CRM
          const savedMsg = await prisma.message.create({
            data: {
              conversationId: paymentOrder.conversationId,
              direction: 'OUTBOUND',
              type: 'TEXT',
              content: confirmMsg,
              sentAt: new Date(),
            },
          });

          await prisma.conversation.update({
            where: { id: paymentOrder.conversationId },
            data: { lastMessageAt: savedMsg.sentAt },
          });

          const io = (global as any).io;
          if (io) {
            io.emit('message:new', savedMsg);
          }
        } catch (error) {
          console.error('Error enviando mensaje de confirmación por WhatsApp:', error);
        }
      }

      const io = (global as any).io;
      if (io) {
        if (updatedConv) io.emit('conversation:updated', updatedConv);
        if (createdShipment) io.emit('shipment:created', createdShipment);
      }
    }

    const io = (global as any).io;
    if (io) {
      io.emit('payment:updated', {
        ...paymentOrder,
        amount: Number(paymentOrder.amount),
      });
      if (data.status === 'PAID') {
        io.emit('payment:confirmed', {
          id: paymentOrder.id,
          status: paymentOrder.status,
        });
      }
    }

    return NextResponse.json({
      ...paymentOrder,
      amount: Number(paymentOrder.amount),
      shipment: createdShipment,
    });
  } catch (error) {
    console.error('Error updating payment order:', error);
    return NextResponse.json({ error: 'Error updating payment order' }, { status: 500 });
  }
}
