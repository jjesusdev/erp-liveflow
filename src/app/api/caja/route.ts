import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseEnum, PAYMENT_STATUSES, PAYMENT_PROVIDERS } from '@/lib/enums';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const search = searchParams.get('search');
    const dateRange = searchParams.get('range'); // 'today', 'week', 'month', 'all'

    const where: any = {};

    if (status && status !== 'all') {
      const parsedStatus = parseEnum(PAYMENT_STATUSES, status);
      if (parsedStatus) where.status = parsedStatus;
    }

    if (provider && provider !== 'all') {
      const parsedProvider = parseEnum(PAYMENT_PROVIDERS, provider);
      if (parsedProvider) where.provider = parsedProvider;
    }

    if (search) {
      where.OR = [
        { concept: { contains: search, mode: 'insensitive' } },
        { lead: { name: { contains: search, mode: 'insensitive' } } },
        { lead: { phone: { contains: search } } },
        { id: { startsWith: search } },
      ];
    }

    if (dateRange === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      where.createdAt = { gte: startOfDay };
    } else if (dateRange === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      where.createdAt = { gte: sevenDaysAgo };
    } else if (dateRange === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.createdAt = { gte: thirtyDaysAgo };
    }

    const paymentOrders = await prisma.paymentOrder.findMany({
      where,
      include: {
        lead: true,
        conversation: true,
        createdBy: true,
        shipment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      paymentOrders.map((order) => ({ ...order, amount: Number(order.amount) }))
    );
  } catch (error) {
    console.error('Error fetching payment orders in caja:', error);
    return NextResponse.json({ error: 'Error fetching payment orders' }, { status: 500 });
  }
}
