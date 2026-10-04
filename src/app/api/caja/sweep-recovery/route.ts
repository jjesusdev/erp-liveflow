import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';

/**
 * Realiza un barrido masivo de recordatorios a clientas con apartados
 * pendientes o expirados para recuperar ventas post-Live.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { discountPercent = 0, customMessage } = body;

    const pendingOrders = await prisma.paymentOrder.findMany({
      where: {
        status: { in: ['PENDING', 'SENT', 'EXPIRED'] },
      },
      include: {
        lead: true,
      },
    });

    if (pendingOrders.length === 0) {
      return NextResponse.json({ message: 'No hay pedidos pendientes para recuperar', count: 0 });
    }

    const client = (globalThis as any).whatsappClient;
    const io = (globalThis as any).io;
    let sentCount = 0;

    for (const order of pendingOrders) {
      if (!order.lead?.phone) continue;

      const clientName = order.lead.name || 'Hola';
      const originalAmount = Number(order.amount);
      const discount = (originalAmount * (discountPercent || 0)) / 100;
      const finalAmount = (originalAmount - discount).toFixed(2);
      const refCode = order.id.slice(0, 8).toUpperCase();

      let msg = customMessage;
      if (!msg) {
        msg = discountPercent > 0
          ? `¡Hola ${clientName}! ✨ Vimos que apartaste "${order.concept}" en el Live. Para apoyarte a cerrar tu pedido hoy, te dejamos un descuento especial: De $${originalAmount.toFixed(2)} a solo *$${finalAmount} ${order.currency}*. Referencia: ${refCode}. ¿Te gustaría liquidarlo hoy? 🎁`
          : `¡Hola ${clientName}! ✨ Te recordamos que tienes tu apartado de "${order.concept}" por $${originalAmount.toFixed(2)} ${order.currency} (Ref: ${refCode}). Confírmanos si aún deseas tu pedido para no liberar las prendas. ¡Quedamos atentas! 💕`;
      }

      if (client) {
        try {
          const jid = `${order.lead.phone.replace(/\D/g, '')}@s.whatsapp.net`;
          await client.sendMessage(jid, { text: msg });

          await prisma.message.create({
            data: {
              conversationId: order.conversationId,
              direction: 'OUTBOUND',
              type: 'TEXT',
              content: msg,
              sentAt: new Date(),
            },
          });
          sentCount++;
        } catch (err) {
          console.error('[sweep-recovery] Error enviando a', order.lead.phone, err);
        }
      }
    }

    await logActivity({
      action: 'RECOVERY_SWEEP_EXECUTED',
      details: {
        totalTargeted: pendingOrders.length,
        messagesSent: sentCount,
        discountPercent,
      },
    });

    return NextResponse.json({
      success: true,
      recoveredCount: sentCount,
      totalPending: pendingOrders.length,
    });
  } catch (error) {
    console.error('Error running recovery sweep:', error);
    return NextResponse.json({ error: 'Error ejecutando barrido de recuperación' }, { status: 500 });
  }
}