import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { reminderSendSchema } from "@/lib/schemas";
import { processPaymentReminders } from "@/lib/reminderWorker";

/**
 * GET /api/caja/reminders
 * Obtiene información sobre órdenes pendientes que podrían recibir recordatorios.
 */
export async function GET() {
  const org = await prisma.organization.findFirst();
  const config = (org?.settings as any) ?? {};

  const reminderEnabled = config.reminderEnabled ?? false;
  const reminderBeforeMinutes = config.reminderBeforeMinutes || 15;

  if (!reminderEnabled) {
    return NextResponse.json({
      enabled: false,
      message: "Los recordatorios automáticos están desactivados",
      settings: {
        reminderBeforeMinutes,
      },
    });
  }

  // Contar órdenes pendientes que están por expirar (en las próximas 2 horas)
  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const pendingCount = await prisma.paymentOrder.count({
    where: {
      status: { in: ["PENDING", "SENT"] },
      expiresAt: {
        gte: now,
        lte: twoHoursFromNow,
      },
    },
  });

  return NextResponse.json({
    enabled: true,
    pendingCount,
    settings: {
      reminderBeforeMinutes,
      reminderDays: config.reminderDays || 7,
    },
  });
}

/**
 * POST /api/caja/reminders
 * Envía recordatorios manualmente a órdenes pendientes.
 */
export const POST = apiHandler({
  body: reminderSendSchema,
  handler: async (_req, body) => {
    const { reminderType = "PENDING_ONLY", customMessage = null, dryRun = false } = body;

    const result = await processPaymentReminders(reminderType, customMessage, dryRun);

    return NextResponse.json({
      success: true,
      ...result,
    });
  },
});
