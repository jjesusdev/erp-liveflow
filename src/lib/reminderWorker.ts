import { prisma } from "./prisma";
import { logActivity } from "./audit";

interface ReminderResult {
  sentCount: number;
  totalPending: number;
  details: Array<{ orderId: string; leadPhone: string; status: string }>;
}

/**
 * Type for Organization.settings - configuración de recordatorios y negocio
 */
interface OrganizationSettings {
  reminderEnabled?: boolean;
  reminderBeforeMinutes?: number;
  reminderDays?: number;
  currency?: string;
  bankName?: string;
  bankBeneficiary?: string;
  bankAccountNumber?: string;
  bankClabe?: string;
  bankNotes?: string;
  autoExpireOrders?: boolean;
  orderExpirationMinutes?: number;
  autoReplyEnabled?: boolean;
  autoReplyDelayMs?: number;
  welcomeMessage?: string;
  awayMessage?: string;
  queueMessage?: string;
}

/**
 * Worker para buscar y enviar recordatorios automáticos de órdenes de pago pendientes.
 * Se ejecuta antes de la expiración de la orden (configurado en reminderBeforeMinutes).
 */
export async function processPaymentReminders(
  reminderType: "PENDING_ONLY" | "EXPIRED_ONLY" | "ALL_PRIOR" = "PENDING_ONLY",
  customMessage: string | null = null,
  dryRun: boolean = false,
  orgId?: string // <-- Nuevo parámetro para multi-tenant
): Promise<ReminderResult> {
  try {
    // Obtener configuración de la organización
    // Si no se proporciona orgId, usar la primera organización en base (fallback para workers legacy)
    const org = await prisma.organization.findFirst({
      where: orgId ? { id: orgId } : {},
    });
    const config = (org?.settings as OrganizationSettings) ?? {};

    // Verificar si los recordatorios están habilitados
    if (!config.reminderEnabled) {
      return { sentCount: 0, totalPending: 0, details: [] };
    }

    const targetOrgId = orgId || org?.id;
    const now = new Date();
    const expirationCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Construir el filtro según el tipo de recordatorio
    let statusFilter:
      "PENDING" | "SENT" | "EXPIRED" | "PAID" | "CANCELLED" | "REFUNDED" | "PENDING_SENT" =
      "PENDING";
    if (reminderType === "EXPIRED_ONLY") {
      statusFilter = "EXPIRED";
    } else if (reminderType === "ALL_PRIOR") {
      statusFilter = "PENDING_SENT"; // Usaremos el array en el where
    }

    // Buscar órdenes que cumplan con los criterios
    // Usamos include explícito para obtener lead y conversation
    const pendingOrders = await prisma.paymentOrder.findMany({
      where: {
        expiresAt: {
          gte: now, // Sólo órdenes que aún no hayan expirado
          lte: expirationCutoff,
        },
        ...(targetOrgId ? { orgId: targetOrgId } : {}),
        ...(reminderType === "ALL_PRIOR"
          ? { status: { in: ["PENDING", "SENT", "EXPIRED"] } }
          : { status: statusFilter as any }),
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

    const client = (globalThis as { whatsappClient?: unknown }).whatsappClient;
    const io = (globalThis as { io?: unknown }).io;
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
        // Tiempo restante (mínimo 0 para evitar valores negativos)
        const remainingTime = Math.max(
          0,
          Math.round((order.expiresAt!.getTime() - now.getTime()) / 60_000)
        );
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
          await (
            client as { sendMessage: (jid: string, text: { text: string }) => Promise<void> }
          ).sendMessage(jid, { text: message });

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
      (io as { emit: (event: string, data: unknown) => void }).emit("reminders:processed", {
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
