import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiHandler } from "@/lib/api-handler";
import { campaignCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { resolveOperatorId } from "@/lib/operator";
import { parseEnum, CAMPAIGN_STATUSES } from "@/lib/enums";
import { sendCampaign } from "@/lib/campaignSender";

export const GET = apiHandler({
  handler: async (req) => {
    const rawStatus = req.nextUrl.searchParams.get("status");
    const status = parseEnum(CAMPAIGN_STATUSES, rawStatus);

    if (rawStatus !== null && !status) {
      return NextResponse.json({ error: "Estado de campana invalido" }, { status: 400 });
    }

    const where: Prisma.CampaignWhereInput = status ? { status } : {};

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        recipients: {
          include: { lead: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(campaigns);
  },
});

export const POST = apiHandler({
  body: campaignCreateSchema,
  handler: async (_req, body) => {
    const { name, message, scheduledAt, sendNow } = body;

    const createdById = await resolveOperatorId(body.operatorId);

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    if (scheduledDate && scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: "La fecha de programacion debe ser futura" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        message,
        createdById,
        status: scheduledDate ? "SCHEDULED" : "DRAFT",
        scheduledAt: scheduledDate,
      },
    });

    // Enviar ya: lanza el loop en background y responde con la campana creada.
    if (sendNow) {
      const result = await sendCampaign(campaign.id);
      if (!result.started) {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: "DRAFT" },
        });
        return NextResponse.json({
          ...campaign,
          status: "DRAFT",
          warning: result.error,
        });
      }
      const fresh = await prisma.campaign.findUnique({ where: { id: campaign.id } });
      return NextResponse.json(fresh || campaign);
    }

    return NextResponse.json(campaign);
  },
});
