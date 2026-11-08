import { prisma } from "./prisma";
import { logActivity } from "./audit";

interface ReminderResult {
  sentCount: number;
  totalPending: number;
  details: Array<{ orderId: string; leadPhone: string; status: string }>;
}

/**
 * Worker para buscar y enviar recordatorios automáticos de órdenes de pago pendientes.
 * Se ejecuta antes de la expiración de la orden (configurado en reminderBeforeMinutes).
 */
export async function processPaymentReminders(
  reminderType: "PENDING_ONLY" | "EXPIRED_ONLY" | "ALL_PRIOR" = "PENDING_ONLY",
  customMessage: string | null = null,
  dryRun: boolean = false
): Promise<ReminderResult> {
  try {
    // Obtener configuración de la organización
    const org = await prisma.organization.findFirst();
    const config = (org?.settings as any) ?? {};

    // Verificar si los recordatorios están habilitados
    if (!config.reminderEnabled) {
      return { sentCount: 0, totalPending: 0, details: [] };
    }

    const reminderBeforeMinutes = config.reminderBeforeMinutes || 15;
    const now = new Date();
    const reminderCutoff = new Date(now.getTime() - reminderBeforeMinutes * 60_000);
    const expirationCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Solo recordatorios de hoy

    // Construir el filtro según el tipo de recordatorio
    const where: any = {
      status:
        reminderType === "PENDING_ONLY"
          ? "PENDING"
          : reminderType === "EXPIRED_ONLY"
            ? "EXPIRED"
            : undefined,
    };

    if (reminderType === "ALL_PRIOR") {
      where.status = { in: ["PENDING", "SENT", "EXPIRED"] };
    }

    // Buscar órdenes que cumplan con los criterios
    const pendingOrders = await prisma.paymentOrder.findMany({
      where: {
        ...where,
        expiresAt: {
          gte: reminderCutoff,
          lte: expirationCutoff,
        },
        OR: [
          { sentAt: null, expiresAt: { gte: reminderCutoff, lte: expirationCutoff } },
          {
            sentAt: { gte: reminderCutoff },
            expiresAt: { gte: reminderCutoff, lte: expirationCutoff },
          },
        ],
      },
      include: {
        lead: true,
        conversation: true,
      },
      orderBy: { expiresAt: "asc" },
    });

    if (pendingOrders.length === 0) {
      return { sentCount: 0, totalPending: 0, details: [] };
    }

    const client = (globalThis as any).whatsappClient;
    const io = (globalThis as any).io;
    let sentCount = 0;
    const details: Array<{ orderId: string; leadPhone: string; status: string }> = [];

    for (const order of pendingOrders) {
      if (!order.lead?.phone) continue;

      // Construir el mensaje de recordatorio
      const amount = Number(order.amount);
      let message: string;
      if (customMessage) {
        message = customMessage;
      } else {
        const clientName = order.lead.name || "Hola";
        const remainingTime = Math.round((order.expiresAt!.getTime() - now.getTime()) / 60_000);
        const reference = order.id.slice(0, 8).toUpperCase();

        message = `¡Hola ${clientName}! Te recordamos tu apartado "${order.concept}" por $${amount.toFixed(2)} ${order.currency} (Ref: ${reference}). Tu apartado expirará en aproximadamente ${remainingTime} minutos. Si aún deseas tu pedido, por favor confírmalo para que podamos reservar las prendas. 🙏`;
      }

      if (dryRun) {
        // En modo dryRun, no se envía el mensaje pero se registra
        details.push({ orderId: order.id, leadPhone: order.lead.phone, status: order.status });
        continue;
      }

      if (client) {
        try {
          const jid = `${order.lead.phone.replace(/\D/g, "")}@s.whatsapp.net`;
          await client.sendMessage(jid, { text: message });

          // Registrar el mensaje enviado
          await prisma.message.create({
            data: {
              conversationId: order.conversationId,
              direction: "OUTBOUND",
              type: "TEXT",
              content: message,
              sentAt: new Date(),
            },
          });

          sentCount++;
          details.push({ orderId: order.id, leadPhone: order.lead.phone, status: order.status });
        } catch (err) {
          console.error("[reminder-worker] Error enviando recordatorio a", order.lead.phone, err);
        }
      }
    }

    // Registrar en el log de actividades
    await logActivity({
      action: "PAYMENT_REMINDERS_SENT",
      details: {
        totalPending: pendingOrders.length,
        sentCount,
        reminderType,
        dryRun,
      },
    });

    // Emitir evento por Socket.io
    if (io) {
      io.emit("reminders:processed", {
        sentCount,
        totalPending: pendingOrders.length,
        details,
      });
    }

    return { sentCount, totalPending: pendingOrders.length, details };
  } catch (error) {
    console.error("[reminder-worker] Error procesando recordatorios:", error);
    return { sentCount: 0, totalPending: 0, details: [] };
  }
}
