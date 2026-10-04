import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizePhone(raw: string) {
  const plus = raw.trim().startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  return (plus ? '+' : '') + digits;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        conversations: { orderBy: { createdAt: 'desc' } },
        paymentOrders: { orderBy: { createdAt: 'desc' } },
        shipments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      ...lead,
      paymentOrders: lead.paymentOrders.map((order) => ({
        ...order,
        amount: Number(order.amount),
      })),
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json({ error: 'Error fetching lead' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.phone !== undefined) {
      const phone = normalizePhone(String(body.phone || ''));
      if (!phone || phone.replace(/\D/g, '').length < 8) {
        return NextResponse.json(
          { error: 'Telefono invalido (minimo 8 digitos)' },
          { status: 400 }
        );
      }
      if (phone !== existing.phone) {
        const duplicated = await prisma.lead.findUnique({ where: { phone } });
        if (duplicated) {
          return NextResponse.json(
            { error: 'Ya existe un cliente con ese telefono' },
            { status: 409 }
          );
        }
      }
      data.phone = phone;
    }

    if (body.name !== undefined) {
      data.name = body.name?.trim() || null;
    }
    if (body.source !== undefined) {
      data.source = body.source?.trim() || null;
    }
    if (body.internalNotes !== undefined) {
      data.internalNotes = body.internalNotes || null;
    }
    if (body.addressStreet !== undefined) data.addressStreet = body.addressStreet || null;
    if (body.addressNumber !== undefined) data.addressNumber = body.addressNumber || null;
    if (body.addressColonia !== undefined) data.addressColonia = body.addressColonia || null;
    if (body.addressCity !== undefined) data.addressCity = body.addressCity || null;
    if (body.addressState !== undefined) data.addressState = body.addressState || null;
    if (body.addressZipCode !== undefined) data.addressZipCode = body.addressZipCode || null;
    if (body.addressNotes !== undefined) data.addressNotes = body.addressNotes || null;

    const lead = await prisma.lead.update({ where: { id }, data });
    return NextResponse.json(lead);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un cliente con ese telefono' },
        { status: 409 }
      );
    }
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Error updating lead' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.lead.findUnique({
      where: { id },
      include: {
        conversations: { select: { id: true }, take: 1 },
        paymentOrders: { select: { id: true }, take: 1 },
        shipments: { select: { id: true }, take: 1 },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    if (
      existing.conversations.length > 0 ||
      existing.paymentOrders.length > 0 ||
      existing.shipments.length > 0
    ) {
      return NextResponse.json(
        { error: 'No se puede eliminar: el cliente tiene historial de conversaciones, cobros o envios' },
        { status: 409 }
      );
    }

    await prisma.campaignRecipient.deleteMany({ where: { leadId: id } });
    await prisma.lead.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Error deleting lead' }, { status: 500 });
  }
}
