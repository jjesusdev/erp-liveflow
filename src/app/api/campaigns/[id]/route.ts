import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        recipients: {
          include: { lead: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campana no encontrada' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json({ error: 'Error fetching campaign' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Campana no encontrada' }, { status: 404 });
    }

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.message !== undefined) data.message = body.message;
    if (body.scheduledAt !== undefined) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }

    const campaign = await prisma.campaign.update({ where: { id }, data });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Error updating campaign' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Campana no encontrada' }, { status: 404 });
    }

    await prisma.campaignRecipient.deleteMany({ where: { campaignId: id } });
    await prisma.campaign.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Error deleting campaign' }, { status: 500 });
  }
}