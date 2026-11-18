import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MarkPaidResult =
  | { status: "not_found" }
  | { status: "already_paid" }
  | {
      status: "paid";
      order: Prisma.PaymentOrderGetPayload<{ include: { lead: true; conversation: true } }>;
      conversation: Prisma.ConversationGetPayload<{
        include: {
          lead: true;
          messages: true;
          paymentOrders: true;
        };
      }>;
      shipment: Prisma.ShipmentGetPayload<{ include: { lead: true; paymentOrder: true } }>;
    };

/** Señal interna para abortar la transacción cuando otro proceso ganó la carrera. */
class AlreadyPaidError extends Error {}

/**
 * Transición atómica PENDING/SENT → PAID con idempotencia, actualización de
 * conversación y creación de shipment. Única fuente de verdad usada por el
 * webhook de MercadoPago y por el PATCH manual de cobros.
 *
 * La guarda `status: { not: "PAID" }` va dentro de la transacción: dos
 * webhooks concurrentes no pueden crear dos shipments para el mismo cobro
 * (Shipment.paymentOrderId es unique).
 */
export async function markPaymentAsPaid(
  orderId: string,
  metadata?: Prisma.InputJsonValue,
  extra?: Prisma.PaymentOrderUncheckedUpdateInput,
  orgId?: string
): Promise<MarkPaidResult> {
  const existing = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  if (!existing) return { status: "not_found" };
  if (existing.status === "PAID") return { status: "already_paid" };

  try {
    const [order, conversation, shipment] = await prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentOrder.updateMany({
        where: { id: orderId, status: { not: "PAID" } },
        data: {
          status: "PAID",
          paidAt: new Date(),
          ...(metadata !== undefined ? { metadata } : {}),
          ...extra,
        },
      });
      if (claimed.count === 0) throw new AlreadyPaidError();

      const updatedOrder = await tx.paymentOrder.findUniqueOrThrow({
        where: { id: orderId },
        include: { lead: true, conversation: true },
      });

      const updatedConversation = await tx.conversation.update({
        where: { id: updatedOrder.conversationId },
        data: { status: "PAID" },
        include: {
          lead: true,
          messages: { orderBy: { sentAt: "desc" }, take: 1 },
          paymentOrders: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });

      const existingShipment = await tx.shipment.findUnique({
        where: { paymentOrderId: updatedOrder.id },
        include: { lead: true, paymentOrder: true },
      });
      const updatedShipment =
        existingShipment ??
        (await tx.shipment.create({
          data: {
            orgId: updatedOrder.orgId ?? orgId,
            paymentOrderId: updatedOrder.id,
            leadId: updatedOrder.leadId,
            status: "PENDING",
          },
          include: { lead: true, paymentOrder: true },
        }));

      return [updatedOrder, updatedConversation, updatedShipment] as const;
    });

    return { status: "paid", order, conversation, shipment };
  } catch (error) {
    if (error instanceof AlreadyPaidError) return { status: "already_paid" };
    throw error;
  }
}
