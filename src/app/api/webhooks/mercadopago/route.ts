import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

export async function POST(req: NextRequest) {
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  try {
    if (body.type !== 'payment' || body.action !== 'payment.created') {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken || accessToken.includes('xxx')) {
      return NextResponse.json({ error: 'MP_ACCESS_TOKEN no configurado' }, { status: 500 });
    }

    const mpPayment = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (mpPayment.data.status !== 'approved') {
      return NextResponse.json({ received: true });
    }

    const externalRef = mpPayment.data.external_reference;
    if (!externalRef) {
      return NextResponse.json({ received: true });
    }

    // Idempotencia: si ya estaba pagado no reprocesamos.
    const existing = await prisma.paymentOrder.findUnique({
      where: { id: externalRef },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Payment order not found' }, { status: 404 });
    }

    if (existing.status === 'PAID') {
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    // Transacción atómica de pago e idempotencia
    const [paymentOrder, updatedConv, createdShipment] = await prisma.$transaction(
      async (tx) => {
        const order = await tx.paymentOrder.update({
          where: { id: externalRef },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            metadata: { mpPaymentId: paymentId },
          },
          include: { lead: true },
        });

        const conv = await tx.conversation.update({
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

        let ship = null;
        if (!existingShipment) {
          ship = await tx.shipment.create({
            data: {
              paymentOrderId: order.id,
              leadId: order.leadId,
              status: 'PENDING',
            },
            include: { lead: true, paymentOrder: true },
          });
        } else {
          ship = existingShipment;
        }

        return [order, conv, ship];
      }
    );

    const io = (global as any).io;
    if (io) {
      io.emit('payment:confirmed', {
        id: paymentOrder.id,
        status: paymentOrder.status,
      });
      io.emit('payment:updated', {
        ...paymentOrder,
        amount: Number(paymentOrder.amount),
      });
      if (updatedConv) io.emit('conversation:updated', updatedConv);
      if (createdShipment) io.emit('shipment:created', createdShipment);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Error processing webhook' }, { status: 500 });
  }
}