import { prisma } from "./prisma";
import { getIO } from "./realtime/events";

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

    getIO()?.emit("activity:new", log);

    return log;
  } catch (error) {
    console.error("[audit] Error registrando actividad:", error);
    return null;
  }
}
