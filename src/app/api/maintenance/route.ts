import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'PURGE_OLD_LOGS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deleted = await prisma.activityLog.deleteMany({
        where: {
          createdAt: { lt: thirtyDaysAgo },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Se eliminaron ${deleted.count} registros de auditoría antiguos.`,
        deletedCount: deleted.count,
      });
    }

    if (action === 'RESET_TEST_DATA') {
      // Solo borra órdenes CANCELLED o EXPIRED para depurar la base de datos
      const deleted = await prisma.paymentOrder.deleteMany({
        where: {
          status: { in: ['CANCELLED', 'EXPIRED'] },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Se depuraron ${deleted.count} órdenes expiradas y canceladas.`,
        deletedCount: deleted.count,
      });
    }

    return NextResponse.json({ error: 'Acción de mantenimiento no reconocida' }, { status: 400 });
  } catch (error) {
    console.error('Error executing maintenance:', error);
    return NextResponse.json({ error: 'Error ejecutando mantenimiento' }, { status: 500 });
  }
}