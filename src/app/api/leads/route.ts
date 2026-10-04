import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizePhone(raw: string) {
  // Conserva el + inicial y elimina espacios/guiones/paréntesis.
  const plus = raw.trim().startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  return (plus ? '+' : '') + digits;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search');
    const phone = searchParams.get('phone');

    const where: any = {};

    if (phone) {
      where.phone = { contains: phone };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
        },
        paymentOrders: {
          orderBy: { createdAt: 'desc' },
        },
        shipments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ lastInteractionAt: { sort: 'desc', nulls: 'last' } }],
    });

    return NextResponse.json(
      leads.map((lead) => {
        const paidOrders = lead.paymentOrders.filter((o) => o.status === 'PAID');
        const totalPaidCount = paidOrders.length;
        const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);

        let tier: 'VIP' | 'FREQUENT' | 'NEW' | 'GHOST' = 'NEW';
        if (totalPaidCount >= 3 || totalSpent >= 2000) {
          tier = 'VIP';
        } else if (totalPaidCount >= 1) {
          tier = 'FREQUENT';
        } else {
          const hasExpiredOrCancelled = lead.paymentOrders.some(
            (o) => o.status === 'EXPIRED' || o.status === 'CANCELLED'
          );
          if (hasExpiredOrCancelled) {
            tier = 'GHOST';
          }
        }

        return {
          ...lead,
          tier,
          totalPaidCount,
          totalSpent,
          paymentOrders: lead.paymentOrders.map((order) => ({
            ...order,
            amount: Number(order.amount),
          })),
        };
      })
    );
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Error fetching leads' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normalizePhone(String(body.phone || ''));

    if (!phone || phone.replace(/\D/g, '').length < 8) {
      return NextResponse.json(
        { error: 'Telefono invalido (minimo 8 digitos)' },
        { status: 400 }
      );
    }

    const existing = await prisma.lead.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un cliente con ese telefono' },
        { status: 409 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        phone,
        name: body.name?.trim() || null,
        source: body.source?.trim() || 'manual',
        lastInteractionAt: new Date(),
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un cliente con ese telefono' },
        { status: 409 }
      );
    }
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Error creating lead' }, { status: 500 });
  }
}
