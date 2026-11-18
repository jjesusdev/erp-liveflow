import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { campaignUpdateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/session";
import { whereOrg } from "@/lib/org";

export const GET = apiHandler({
  handler: async (_req, _body, context) => {
    const { id } = await context.params;
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const campaign = await prisma.campaign.findFirst({
      where: { ...whereOrg(orgId), id },
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
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const existing = await prisma.campaign.findFirst({ where: { ...whereOrg(orgId), id } });
    if (!existing) {
      return NextResponse.json({ error: "Campana no encontrada" }, { status: 404 });
    }

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.message !== undefined) data.message = body.message;
    if (body.scheduledAt !== undefined) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }

    const campaign = await prisma.campaign.update({ where: { ...whereOrg(orgId), id }, data });

    return NextResponse.json(campaign);
  },
});

export const DELETE = apiHandler({
  handler: async (_req, _body, context) => {
    const { id } = await context.params;
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const existing = await prisma.campaign.findFirst({ where: { ...whereOrg(orgId), id } });
    if (!existing) {
      return NextResponse.json({ error: "Campana no encontrada" }, { status: 404 });
    }

    await prisma.campaignRecipient.deleteMany({
      where: { campaignId: id, campaign: { ...whereOrg(orgId) } },
    });
    await prisma.campaign.delete({ where: { ...whereOrg(orgId), id } });

    return NextResponse.json({ deleted: true });
  },
});
