import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const carrier = searchParams.get('carrier');
    const leadId = searchParams.get('leadId');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (carrier) {
      where.carrier = { contains: carrier, mode: 'insensitive' };
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(shipments);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return NextResponse.json({ error: 'Error fetching shipments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentOrderId, trackingNumber, carrier, notes } = body;

    if (!paymentOrderId) {
      return NextResponse.json(
        { error: 'paymentOrderId es obligatorio' },
        { status: 400 }
      );
    }

    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
    });

    if (!paymentOrder) {
      return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 });
    }

    const existing = await prisma.shipment.findUnique({
      where: { paymentOrderId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Este cobro ya tiene un envio registrado' },
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
        status: 'PENDING',
      },
      include: { lead: true, paymentOrder: true },
    });

    // La conversacion pasa a SHIPPED cuando el paquete sale en transito
    // (manejado en PATCH), no al crear el envio pendiente.

    return NextResponse.json(shipment);
  } catch (error) {
    console.error('Error creating shipment:', error);
    return NextResponse.json({ error: 'Error creating shipment' }, { status: 500 });
  }
}