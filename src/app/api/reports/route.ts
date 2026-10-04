import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const hasRange = Boolean(startDate && endDate);

    const range = hasRange
      ? { gte: new Date(startDate!), lte: new Date(endDate!) }
      : undefined;

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
        where: { status: 'PAID', ...(range && { paidAt: range }) },
      }),
      prisma.paymentOrder.count({
        where: { status: 'PAID', ...(range && { paidAt: range }) },
      }),
      prisma.paymentOrder.count({
        where: { status: { in: ['PENDING', 'SENT'] } },
      }),
      prisma.conversation.count({
        where: range ? { createdAt: range } : undefined,
      }),
      prisma.conversation.count(),
      prisma.conversation.count({
        where: { status: { in: ['NEW', 'ATTENTION', 'AWAITING_PAYMENT'] } },
      }),
      prisma.lead.count(),
      prisma.lead.count({
        where: range ? { firstContactAt: range } : undefined,
      }),
      prisma.lead.count({
        where: range ? { lastInteractionAt: range } : undefined,
      }),
      prisma.shipment.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.paymentOrder.aggregate({
        _sum: { amount: true },
        where: {
          status: 'PAID',
          provider: { in: ['TRANSFER', 'CASH'] },
          ...(range && { paidAt: range }),
        },
      }),
      prisma.paymentOrder.aggregate({
        _sum: { amount: true },
        where: {
          status: 'PAID',
          provider: { in: ['MERCADOPAGO', 'STRIPE'] },
          ...(range && { paidAt: range }),
        },
      }),
      prisma.paymentOrder.findMany({
        where: { status: 'PAID', ...(range && { paidAt: range }) },
        select: { paidAt: true, amount: true, concept: true },
        orderBy: { paidAt: 'desc' },
        take: 50,
      }),
    ]);

    const conversionRate =
      periodConversations > 0 ? (paidOrders / periodConversations) * 100 : 0;

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
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Error fetching reports' }, { status: 500 });
  }
}