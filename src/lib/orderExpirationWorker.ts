import { prisma } from './prisma';
import { logActivity } from './audit';

/**
 * Worker en segundo plano para procesar la expiración automática de pedidos
 * y la liberación del stock de las prendas del Live.
 */
export async function processExpiredPaymentOrders() {
  try {
    const config = await prisma.businessConfig.findFirst();
    if (config && config.autoExpireOrders === false) {
      return 0;
    }

    const now = new Date();

    // Buscar pedidos en PENDING o SENT cuya fecha de expiración ya pasó
    const expiredOrders = await prisma.paymentOrder.findMany({
      where: {
        status: { in: ['PENDING', 'SENT'] },
        expiresAt: { lte: now },
      },
      include: {
        lead: true,
      },
    });

    if (expiredOrders.length === 0) return 0;

    const client = (globalThis as any).whatsappClient;
    const io = (globalThis as any).io;

    for (const order of expiredOrders) {
      // 1. Actualizar estado a EXPIRED
      const updated = await prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'EXPIRED' },
      });

      // 2. Registrar en la auditoría diaria
      await logActivity({
        action: 'ORDER_AUTO_EXPIRED',
        conversationId: order.conversationId,
        details: {
          orderId: order.id,
          amount: Number(order.amount),
          concept: order.concept,
          client: order.lead?.name || order.lead?.phone,
        },
      });

      // 3. Avisar a la clienta por WhatsApp de la liberación del apartado
      if (client && order.lead?.phone) {
        try {
          const jid = `${order.lead.phone.replace(/\D/g, '')}@s.whatsapp.net`;
          const clientName = order.lead.name || 'Hola';
          const msg = `${clientName}, el tiempo de apartado para tu pedido "${order.concept}" ha vencido y la prenda ha sido liberada para el Live. Si aún la deseas, por favor contáctanos para verificar disponibilidad. ✨`;
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
        } catch (e) {
          console.error('[expiration-worker] Error notificando expiracion:', e);
        }
      }

      // 4. Emitir evento por Socket.io
      if (io) {
        io.emit('payment:updated', {
          ...updated,
          amount: Number(updated.amount),
        });
      }
    }

    return expiredOrders.length;
  } catch (error) {
    console.error('[expiration-worker] Error procesando ordenes expiradas:', error);
    return 0;
  }
}