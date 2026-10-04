import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.liveSession.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    const data: any = {};
    if (body.status === 'ENDED' || body.status === 'ACTIVE') {
      data.status = body.status;
      if (body.status === 'ENDED') {
        data.endedAt = new Date();
      }
    }
    if (body.title !== undefined) data.title = body.title;
    if (body.notes !== undefined) data.notes = body.notes;

    const session = await prisma.liveSession.update({
      where: { id },
      data,
    });

    const io = (globalThis as any).io;
    io?.emit('live:session:updated', session);

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error updating live session:', error);
    return NextResponse.json({ error: 'Error updating live session' }, { status: 500 });
  }
}