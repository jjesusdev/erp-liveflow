import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseEnum, CONVERSATION_STATUSES } from '@/lib/enums';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        lead: true,
        messages: {
          orderBy: { sentAt: 'asc' },
        },
        paymentOrders: {
          orderBy: { createdAt: 'desc' },
        },
        assignedTo: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation no encontrada' }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Error fetching conversation' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.conversation.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Conversation no encontrada' }, { status: 404 });
    }

    const data: any = {};

    if (body.status !== undefined) {
      const status = parseEnum(CONVERSATION_STATUSES, body.status);
      if (!status) {
        return NextResponse.json({ error: 'Estado invalido' }, { status: 400 });
      }
      data.status = status;
      data.closedAt =
        status === 'CLOSED' || status === 'LOST' ? new Date() : null;
    }

    if (body.priority !== undefined) {
      data.priority = Number(body.priority) || 0;
    }

    if (body.assignedToId !== undefined) {
      data.assignedToId = body.assignedToId || null;
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data,
      include: {
        lead: true,
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
        paymentOrders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const io = (global as any).io;
    if (io) {
      io.emit('conversation:updated', conversation);
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Error updating conversation' }, { status: 500 });
  }
}