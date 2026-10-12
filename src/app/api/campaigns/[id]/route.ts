import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { campaignUpdateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

export const GET = apiHandler({
  handler: async (_req, _body, context) => {
    const { id } = await context.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        recipients: {
          include: { lead: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campana no encontrada" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  },
});

export const PUT = apiHandler({
  body: campaignUpdateSchema,
  handler: async (_req, body, context) => {
    const { id } = await context.params;

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Campana no encontrada" }, { status: 404 });
    }

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.message !== undefined) data.message = body.message;
    if (body.scheduledAt !== undefined) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }

    const campaign = await prisma.campaign.update({ where: { id }, data });

    return NextResponse.json(campaign);
  },
});

export const DELETE = apiHandler({
  handler: async (_req, _body, context) => {
    const { id } = await context.params;

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Campana no encontrada" }, { status: 404 });
    }

    await prisma.campaignRecipient.deleteMany({ where: { campaignId: id } });
    await prisma.campaign.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  },
});
