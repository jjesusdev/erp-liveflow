import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { getCarrierProvider } from "@/lib/carriers";

const TRANSIT_STATUSES = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"];
const SHIPPED_CONV_STATUSES = ["PAID", "ATTENTION", "AWAITING_PAYMENT"] as const;

/**
 * Sincroniza el tracking de un envío contra su proveedor.
 * Guarda los eventos recibidos y actualiza el estado del envío.
 */
export const POST = apiHandler({
  handler: async (_req, _body, context) => {
    const { id } = await context.params;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { carrierRef: true, paymentOrder: true },
    });

    if (!shipment) {
      return NextResponse.json({ error: "Envio no encontrado" }, { status: 404 });
    }

    if (!shipment.carrierRef) {
      return NextResponse.json(
        { error: "El envio no tiene un carrier configurado" },
        { status: 400 }
      );
    }

    const provider = getCarrierProvider(shipment.carrierRef.apiProvider);
    if (!provider) {
      return NextResponse.json(
        { error: `Proveedor no registrado: ${shipment.carrierRef.apiProvider}` },
        { status: 400 }
      );
    }

    if (!provider.track) {
      return NextResponse.json(
        { error: `El proveedor ${provider.name} no soporta tracking automatico` },
        { status: 400 }
      );
    }

    if (!shipment.providerRef) {
      return NextResponse.json(
        { error: "El envio no tiene referencia del proveedor" },
        { status: 400 }
      );
    }

    const carrierConfig = (shipment.carrierRef.config as Record<string, unknown> | null) ?? {};

    try {
      const trackingEvents = await provider.track(shipment.providerRef, carrierConfig);

      const created = [];
      for (const event of trackingEvents) {
        const exists = await prisma.shipmentEvent.findFirst({
          where: {
            shipmentId: id,
            status: event.status,
            occurredAt: event.occurredAt,
          },
          select: { id: true },
        });

        if (exists) continue;

        created.push(
          await prisma.shipmentEvent.create({
            data: {
              shipmentId: id,
              status: event.status,
              source: "API",
              note: event.description,
              occurredAt: event.occurredAt,
            },
          })
        );
      }

      const latest = trackingEvents.reduce<(typeof trackingEvents)[number] | null>(
        (acc, event) => (!acc || event.occurredAt > acc.occurredAt ? event : acc),
        null
      );

      const data: Record<string, unknown> = {};
      if (latest) {
        data.status = latest.status;
        if (TRANSIT_STATUSES.includes(latest.status) && !shipment.shippedAt) {
          data.shippedAt = new Date();
        }
        if (latest.status === "DELIVERED") {
          data.deliveredAt = new Date();
        }
      }

      const updated =
        Object.keys(data).length > 0
          ? await prisma.shipment.update({
              where: { id },
              data,
              include: { lead: true, paymentOrder: true, carrierRef: true },
            })
          : shipment;

      if (latest && (TRANSIT_STATUSES.includes(latest.status) || latest.status === "DELIVERED")) {
        await prisma.conversation.updateMany({
          where: {
            paymentOrders: { some: { shipment: { id } } },
            status: { in: [...SHIPPED_CONV_STATUSES] },
          },
          data: { status: "SHIPPED" },
        });
      }

      const io = (global as { io?: { emit: (event: string, payload: unknown) => void } }).io;
      io?.emit("shipment:updated", updated);

      return NextResponse.json({ shipment: updated, events: created });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await prisma.shipmentEvent.create({
        data: {
          shipmentId: id,
          status: shipment.status,
          source: "API",
          note: `Error al sincronizar tracking: ${message}`,
        },
      });

      return NextResponse.json(
        { error: "No se pudo sincronizar el tracking", detail: message },
        { status: 502 }
      );
    }
  },
});
