import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { apiHandler } from "@/lib/api-handler";
import { paymentOrderUpdateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { parseEnum, PAYMENT_STATUSES } from "@/lib/enums";
import { logActivity } from "@/lib/audit";
import { getOperatorContext } from "@/lib/session";
import { whereOrg } from "@/lib/org";
import { toWhatsAppJid } from "@/lib/format";
import { getIO } from "@/lib/realtime/events";
import { markPaymentAsPaid, type MarkPaidResult } from "@/services/PaymentService";

type PaidResult = Extract<MarkPaidResult, { status: "paid" }>;

export const PATCH = apiHandler({
  body: paymentOrderUpdateSchema,
  handler: async (_req, body, context) => {
    const { id } = await context.params;
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const existing = await prisma.paymentOrder.findFirst({
      where: { ...whereOrg(orgId), id },
      include: { lead: true, conversation: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
    }

    let status: (typeof PAYMENT_STATUSES)[number] | undefined;
    if (body.status !== undefined) {
      const parsed = parseEnum(PAYMENT_STATUSES, body.status);
      if (!parsed) {
        return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
      }
      status = parsed;
    }

    const extra: Prisma.PaymentOrderUncheckedUpdateInput = {};
    if (body.concept !== undefined) extra.concept = body.concept;
    if (body.amount !== undefined) extra.amount = body.amount;

    let order: PaidResult["order"] | null = null;
    let updatedConv: PaidResult["conversation"] | null = null;
    let createdShipment: PaidResult["shipment"] | null = null;

    if (status === "PAID") {
      // Transición crítica centralizada: idempotente, transaccional y con shipment.
      const result = await markPaymentAsPaid(id, undefined, extra);
      if (result.status === "not_found") {
        return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
      }
      if (result.status === "paid") {
        ({ order, conversation: updatedConv, shipment: createdShipment } = result);
      } else {
        order = await prisma.paymentOrder.findFirst({
          where: { ...whereOrg(orgId), id },
          include: { lead: true, conversation: true },
        });
      }
    } else {
      order = await prisma.paymentOrder.update({
        where: { id },
        data: {
          ...extra,
          ...(status ? { status, paidAt: existing.paidAt } : {}),
        },
        include: { lead: true, conversation: true },
      });
    }

    if (!order) {
      return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
    }

    await logActivity({
      action: status === "PAID" ? "PAYMENT_APPROVED" : "PAYMENT_UPDATED",
      operatorId: ctx.operatorId,
      conversationId: order.conversationId,
      details: {
        orderId: order.id,
        amount: Number(order.amount),
        previousStatus: existing.status,
        newStatus: status ?? existing.status,
      },
    });

    const io = getIO();

    if (status === "PAID") {
      // Confirmación automática por WhatsApp si el cliente está disponible.
      const client = (
        global as {
          whatsappClient?: {
            sendMessage: (jid: string, payload: { text: string }) => Promise<unknown>;
          };
        }
      ).whatsappClient;
      if (client && order.lead?.phone) {
        try {
          const jid = toWhatsAppJid(order.lead.phone);
          const currency = order.currency || "MXN";
          const formattedAmount = Number(order.amount).toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const confirmMsg = `🎉 ¡Pago confirmado con éxito! Tu pedido '${order.concept}' por $${formattedAmount} ${currency} ha sido recibido y está siendo preparado para envío. Te notificaremos tu número de guía en cuanto esté listo.`;

          await client.sendMessage(jid, { text: confirmMsg });

          const savedMsg = await prisma.message.create({
            data: {
              conversationId: order.conversationId,
              direction: "OUTBOUND",
              type: "TEXT",
              content: confirmMsg,
              sentAt: new Date(),
              orgId,
            },
          });

          await prisma.conversation.update({
            where: { id: order.conversationId },
            data: { lastMessageAt: savedMsg.sentAt },
          });

          io?.emit("message:new", savedMsg);
        } catch (error) {
          console.error("Error enviando mensaje de confirmación por WhatsApp:", error);
        }
      }

      if (updatedConv) io?.emit("conversation:updated", updatedConv);
      if (createdShipment) io?.emit("shipment:created", createdShipment);
    }

    io?.emit("payment:updated", { ...order, amount: Number(order.amount) });
    if (status === "PAID") {
      io?.emit("payment:confirmed", { id: order.id, status: order.status });
    }

    return NextResponse.json({
      ...order,
      amount: Number(order.amount),
      shipment: createdShipment,
    });
  },
});
