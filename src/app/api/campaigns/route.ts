import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveOperatorId } from '@/lib/operator';
import { parseEnum, CAMPAIGN_STATUSES } from '@/lib/enums';
import { sendCampaign } from '@/lib/campaignSender';

export async function GET(req: NextRequest) {
  try {
    const rawStatus = req.nextUrl.searchParams.get('status');
    const status = parseEnum(CAMPAIGN_STATUSES, rawStatus);

    if (rawStatus !== null && !status) {
      return NextResponse.json({ error: 'Estado de campana invalido' }, { status: 400 });
    }

    const where: Prisma.CampaignWhereInput = status ? { status } : {};

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        recipients: {
          include: { lead: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Error fetching campaigns' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, message, scheduledAt, sendNow } = body;

    if (!name || !message) {
      return NextResponse.json(
        { error: 'Nombre y mensaje son obligatorios' },
        { status: 400 }
      );
    }

    const createdById = await resolveOperatorId(body.operatorId);

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    if (scheduledDate && Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Fecha de programacion invalida' }, { status: 400 });
    }
    if (scheduledDate && scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'La fecha de programacion debe ser futura' },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        message,
        createdById,
        status: scheduledDate ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: scheduledDate,
      },
    });

    // Enviar ya: lanza el loop en background y responde con la campana creada.
    if (sendNow) {
      const result = await sendCampaign(campaign.id);
      if (!result.started) {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'DRAFT' },
        });
        return NextResponse.json({
          ...campaign,
          status: 'DRAFT',
          warning: result.error,
        });
      }
      const fresh = await prisma.campaign.findUnique({ where: { id: campaign.id } });
      return NextResponse.json(fresh || campaign);
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Error creating campaign' }, { status: 500 });
  }
}