import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { maintenanceSchema } from "@/lib/schemas";

export const POST = apiHandler({
  body: maintenanceSchema,
  handler: async (_req, body) => {
    const { action } = body;

    if (action === "PURGE_OLD_LOGS") {
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

    if (action === "RESET_TEST_DATA") {
      // Solo borra órdenes CANCELLED o EXPIRED para depurar la base de datos
      const deleted = await prisma.paymentOrder.deleteMany({
        where: {
          status: { in: ["CANCELLED", "EXPIRED"] },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Se depuraron ${deleted.count} órdenes expiradas y canceladas.`,
        deletedCount: deleted.count,
      });
    }

    return NextResponse.json({ error: "Acción de mantenimiento no reconocida" }, { status: 400 });
  },
});
