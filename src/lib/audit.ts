import { prisma } from './prisma';

export async function logActivity({
  action,
  operatorId,
  conversationId,
  details,
}: {
  action: string;
  operatorId?: string | null;
  conversationId?: string | null;
  details?: Record<string, any> | null;
}) {
  try {
    const log = await prisma.activityLog.create({
      data: {
        action,
        operatorId: operatorId || null,
        conversationId: conversationId || null,
        details: details || {},
      },
    });

    const io = (globalThis as any).io;
    io?.emit('activity:new', log);

    return log;
  } catch (error) {
    console.error('[audit] Error registrando actividad:', error);
    return null;
  }
}