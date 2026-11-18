import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/session";
import { whereOrg } from "@/lib/org";

export const GET = apiHandler({
  handler: async (req) => {
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const hasRange = Boolean(startDate && endDate);

    const range = hasRange ? { gte: new Date(startDate!), lte: new Date(endDate!) } : undefined;

    const [
      totalRevenue,
      paidOrders,
      pendingOrders,
      periodConversations,
      totalConversations,
      activeConversations,
      totalLeads,
      newLeads,
      periodLeads,
      shipments,
      products,
      transferRevenue,
      cardRevenue,
      recentPaidOrders,
    ] = await Promise.all([
      prisma.paymentOrder.aggregate({
        _sum: { amount: true },
        where: { ...whereOrg(orgId), status: "PAID", ...(range && { paidAt: range }) },
      }),
      prisma.paymentOrder.count({
        where: { ...whereOrg(orgId), status: "PAID", ...(range && { paidAt: range }) },
      }),
      prisma.paymentOrder.count({
        where: { ...whereOrg(orgId), status: { in: ["PENDING", "SENT"] } },
      }),
      prisma.conversation.count({
        where: { ...whereOrg(orgId), ...(range && { createdAt: range }) },
      }),
      prisma.conversation.count({ where: { ...whereOrg(orgId) } }),
      prisma.conversation.count({
        where: {
          ...whereOrg(orgId),
          status: { in: ["NEW", "ATTENTION", "AWAITING_PAYMENT"] },
        },
      }),
      prisma.lead.count({ where: { ...whereOrg(orgId) } }),
      prisma.lead.count({
        where: { ...whereOrg(orgId), ...(range && { firstContactAt: range }) },
      }),
      prisma.lead.count({
        where: { ...whereOrg(orgId), ...(range && { lastInteractionAt: range }) },
      }),
      prisma.shipment.groupBy({
        by: ["status"],
        _count: { status: true },
        where: { ...whereOrg(orgId) },
      }),
      prisma.product.count({ where: { ...whereOrg(orgId), isActive: true } }),
      prisma.paymentOrder.aggregate({
        _sum: { amount: true },
        where: {
          ...whereOrg(orgId),
          status: "PAID",
          provider: { in: ["TRANSFER", "CASH"] },
          ...(range && { paidAt: range }),
        },
      }),
      prisma.paymentOrder.aggregate({
        _sum: { amount: true },
        where: {
          ...whereOrg(orgId),
          status: "PAID",
          provider: { in: ["MERCADOPAGO", "STRIPE"] },
          ...(range && { paidAt: range }),
        },
      }),
      prisma.paymentOrder.findMany({
        where: { ...whereOrg(orgId), status: "PAID", ...(range && { paidAt: range }) },
        select: { paidAt: true, amount: true, concept: true },
        orderBy: { paidAt: "desc" },
        take: 50,
      }),
    ]);

    const conversionRate = periodConversations > 0 ? (paidOrders / periodConversations) * 100 : 0;

    const totalRevNum = Number(totalRevenue._sum.amount || 0);
    const avgTicket = paidOrders > 0 ? totalRevNum / paidOrders : 0;

    return NextResponse.json({
      totalRevenue: totalRevNum,
      transferRevenue: Number(transferRevenue._sum.amount || 0),
      cardRevenue: Number(cardRevenue._sum.amount || 0),
      averageTicket: Number(avgTicket.toFixed(2)),
      paidOrders,
      pendingOrders,
      totalConversations: periodConversations,
      allTimeConversations: totalConversations,
      activeConversations,
      totalLeads,
      newLeads,
      periodLeads,
      products,
      conversionRate: conversionRate.toFixed(2),
      shipments: shipments.reduce(
        (acc, s) => {
          acc[s.status] = s._count.status;
          return acc;
        },
        {} as Record<string, number>
      ),
      recentPaidOrders: recentPaidOrders.map((o) => ({
        ...o,
        amount: Number(o.amount),
      })),
    });
  },
});
