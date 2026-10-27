import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { shipmentUpdateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { parseEnum, SHIPMENT_STATUSES } from "@/lib/enums";
import { getCarrierProvider } from "@/lib/carriers";
import type { ShipmentStatus as PrismaShipmentStatus, ConversationStatus } from "@prisma/client";

const TRANSIT_STATUSES: string[] = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"];
const SHIPPED_CONV_STATUSES = ["PAID", "ATTENTION", "AWAITING_PAYMENT"] as ConversationStatus[];

export const GET = apiHandler({
  handler: async (_req, _body, context) => {
    const { id } = await context.params;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        lead: true,
        paymentOrder: { include: { conversation: { select: { id: true } } } },
        carrierRef: true,
        events: { orderBy: { occurredAt: "desc" } },
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: "Envio no encontrado" }, { status: 404 });
    }

    return NextResponse.json(shipment);
  },
});

export const PATCH = apiHandler({
  body: shipmentUpdateSchema,
  handler: async (_req, body, context) => {
    const { id } = await context.params;

    const existing = await prisma.shipment.findUnique({
      where: { id },
      include: { lead: true, paymentOrder: true, carrierRef: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Envio no encontrado" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    let isStatusTransitionToInTransit = false;
    let newStatus: PrismaShipmentStatus | undefined;

    if (body.status !== undefined) {
      const status = parseEnum(SHIPMENT_STATUSES, body.status);
      if (!status) {
        return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
      }
      data.status = status;
      newStatus = status;

      if (TRANSIT_STATUSES.includes(status)) {
        if (!existing.shippedAt) data.shippedAt = new Date();
        const wasBeforeTransit =
          !TRANSIT_STATUSES.includes(existing.status) && existing.status !== "DELIVERED";
        if (wasBeforeTransit && status === "IN_TRANSIT") {
          isStatusTransitionToInTransit = true;
        }
      }
      if (status === "DELIVERED") {
        data.deliveredAt = new Date();
      }
      if (status === "FAILED" || status === "RETURNED") {
        data.attempts = (existing.attempts ?? 0) + 1;
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
    if (body.mode !== undefined) {
      data.mode = body.mode || null;
    }
    if (body.carrierId !== undefined) {
      data.carrierId = body.carrierId || null;
    }
    if (body.service !== undefined) {
      data.service = body.service || null;
    }
    if (body.weightGrams !== undefined) {
      data.weightGrams = body.weightGrams ?? null;
    }
    if (body.costClp !== undefined) {
      data.costClp = body.costClp ?? null;
    }
    if (body.labelUrl !== undefined) {
      data.labelUrl = body.labelUrl || null;
    }
    if (body.trackingUrl !== undefined) {
      data.trackingUrl = body.trackingUrl || null;
    }
    if (body.providerRef !== undefined) {
      data.providerRef = body.providerRef || null;
    }
    if (body.driverId !== undefined) {
      data.driverId = body.driverId || null;
    }
    if (body.deliveredTo !== undefined) {
      data.deliveredTo = body.deliveredTo || null;
    }
    if (body.proofPhotoUrl !== undefined) {
      data.proofPhotoUrl = body.proofPhotoUrl || null;
    }

    const shipment = await prisma.shipment.update({
      where: { id },
      data,
      include: {
        lead: true,
        paymentOrder: true,
        carrierRef: true,
      },
    });

    // Sincronizar tracking con proveedor si se solicita
    if (body.syncTracking && existing.carrierRef?.apiProvider && existing.providerRef) {
      const provider = getCarrierProvider(existing.carrierRef.apiProvider);
      if (provider?.track) {
        try {
          const carrierConfig = (existing.carrierRef.config as Record<string, unknown>) ?? {};
          const events = await provider.track(existing.providerRef, carrierConfig);
          for (const ev of events) {
            await prisma.shipmentEvent.create({
              data: {
                shipmentId: id,
                status: ev.status,
                source: "API",
                note: ev.description,
                occurredAt: ev.occurredAt,
              },
            });
          }
        } catch (err) {
          console.error(`[Carrier ${existing.carrierRef.apiProvider}] sync tracking error:`, err);
        }
      }
    }

    if (newStatus && newStatus !== existing.status) {
      await prisma.shipmentEvent.create({
        data: {
          shipmentId: id,
          status: newStatus,
          source: "MANUAL",
          note: body.eventNote || `Estado cambiado a ${newStatus}`,
        },
      });
    }

    // Actualiza la conversación a SHIPPED cuando el paquete sale en camino
    if (newStatus && (TRANSIT_STATUSES.includes(newStatus) || newStatus === "DELIVERED")) {
      await prisma.conversation.updateMany({
        where: {
          paymentOrders: { some: { shipment: { id } } },
          status: { in: SHIPPED_CONV_STATUSES },
        },
        data: { status: "SHIPPED" },
      });
    }

    // Notificación inteligente por WhatsApp al despachar (IN_TRANSIT)
    if (isStatusTransitionToInTransit && body.notifyCustomer !== false) {
      const client = (global as any).whatsappClient;
      if (client && shipment.lead?.phone) {
        try {
          const jid = `${shipment.lead.phone.replace(/\D/g, "")}@s.whatsapp.net`;
          const concept = shipment.paymentOrder?.concept || "Tu pedido";
          const carrier = shipment.carrier || "mensajería local";
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
                direction: "OUTBOUND",
                type: "TEXT",
                content: dispatchMessage,
                sentAt: new Date(),
              },
            });

            const io = (global as any).io;
            if (io) {
              io.emit("message:new", savedMsg);
            }
          }
        } catch (error) {
          console.error("Error enviando notificación de despacho por WhatsApp:", error);
        }
      }
    }

    const io = (global as any).io;
    if (io) {
      io.emit("shipment:updated", shipment);
    }

    return NextResponse.json(shipment);
  },
});

export const DELETE = apiHandler({
  handler: async (_req, _body, context) => {
    const { id } = await context.params;

    const existing = await prisma.shipment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Envio no encontrado" }, { status: 404 });
    }

    await prisma.shipmentEvent.deleteMany({ where: { shipmentId: id } });
    await prisma.shipment.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  },
});
