import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { liveSessionCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/session";
import { whereOrg } from "@/lib/org";
import { getIO } from "@/lib/realtime/events";

export const GET = apiHandler({
  handler: async (req: NextRequest) => {
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const searchParams = req.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") === "true";

    const sessions = await prisma.liveSession.findMany({
      where: {
        ...whereOrg(orgId),
        ...(activeOnly ? { status: "ACTIVE" } : {}),
      },
      include: {
        paymentOrders: {
          select: {
            id: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    const formatted = sessions.map((s) => {
      const paidOrders = s.paymentOrders.filter((o) => o.status === "PAID");
      const totalSales = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);
      return {
        ...s,
        totalSales,
        ordersCount: s.paymentOrders.length,
        paidOrdersCount: paidOrders.length,
      };
    });

    return NextResponse.json(formatted);
  },
});

export const POST = apiHandler({
  body: liveSessionCreateSchema,
  handler: async (req: NextRequest, body) => {
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const { title, platform = "TIKTOK", notes } = body;

    // Si había otra sesión activa, la cerramos automáticamente
    await prisma.liveSession.updateMany({
      where: { ...whereOrg(orgId), status: "ACTIVE" },
      data: { status: "ENDED", endedAt: new Date() },
    });

    const session = await prisma.liveSession.create({
      data: {
        orgId,
        title,
        platform,
        notes: notes || null,
        status: "ACTIVE",
        startedAt: new Date(),
      },
    });

    getIO()?.emit("live:session:started", session);

    return NextResponse.json(session, { status: 201 });
  },
});
