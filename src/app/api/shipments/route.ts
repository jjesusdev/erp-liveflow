import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { shipmentCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

export const GET = apiHandler({
  handler: async (req) => {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const carrier = searchParams.get("carrier");
    const leadId = searchParams.get("leadId");

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (carrier) {
      where.carrier = { contains: carrier, mode: "insensitive" };
    }

    if (leadId) {
      where.leadId = leadId;
    }

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        lead: true,
        paymentOrder: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(shipments);
  },
});

export const POST = apiHandler({
  body: shipmentCreateSchema,
  handler: async (_req, body) => {
    const { paymentOrderId, trackingNumber, carrier, notes } = body;

    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
    });

    if (!paymentOrder) {
      return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
    }

    const existing = await prisma.shipment.findUnique({
      where: { paymentOrderId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Este cobro ya tiene un envio registrado" },
        { status: 409 }
      );
    }

    const shipment = await prisma.shipment.create({
      data: {
        paymentOrderId,
        leadId: paymentOrder.leadId,
        trackingNumber: trackingNumber || null,
        carrier: carrier || null,
        notes: notes || null,
        status: "PENDING",
      },
      include: { lead: true, paymentOrder: true },
    });

    // La conversacion pasa a SHIPPED cuando el paquete sale en transito
    // (manejado en PATCH), no al crear el envio pendiente.

    return NextResponse.json(shipment);
  },
});
