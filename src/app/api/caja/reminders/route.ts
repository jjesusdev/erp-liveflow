import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { reminderSendSchema } from "@/lib/schemas";
import { processPaymentReminders } from "@/lib/reminderWorker";
import { getOperatorContext } from "@/lib/session";
import { whereOrg } from "@/lib/org";

/**
 * GET /api/caja/reminders
 * Obtiene información sobre órdenes pendientes que podrían recibir recordatorios.
 */
export async function GET() {
  // Verificar autenticación y obtener orgId
  const ctx = await getOperatorContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { orgId } = ctx;

  // Obtener configuración de la organización actual
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
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
      ...whereOrg(orgId),
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
    // Verificar autenticación
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { orgId } = ctx;

    const { reminderType = "PENDING_ONLY", customMessage = null, dryRun = false } = body;

    // Pasar orgId al worker
    const result = await processPaymentReminders(reminderType, customMessage, dryRun, orgId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  },
});
