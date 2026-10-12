import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { liveSessionCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

export const GET = apiHandler({
  handler: async (req: NextRequest) => {
    const searchParams = req.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") === "true";

    const sessions = await prisma.liveSession.findMany({
      where: activeOnly ? { status: "ACTIVE" } : undefined,
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
    const { title, platform = "TIKTOK", notes } = body;

    // Si había otra sesión activa, la cerramos automáticamente
    await prisma.liveSession.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "ENDED", endedAt: new Date() },
    });

    const session = await prisma.liveSession.create({
      data: {
        title,
        platform,
        notes: notes || null,
        status: "ACTIVE",
        startedAt: new Date(),
      },
    });

    const io = (globalThis as any).io;
    io?.emit("live:session:started", session);

    return NextResponse.json(session, { status: 201 });
  },
});
