import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { businessConfigSchema, type BusinessConfigInput } from "@/lib/schemas";
import { getOperatorContext } from "@/lib/session";

export async function GET() {
  const ctx = await getOperatorContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const orgId = ctx.orgId;

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const config = (org?.settings as any) ?? {};

  if (!config || Object.keys(config).length === 0) {
    return NextResponse.json({
      businessName: "Mi Negocio",
      currency: "MXN",
      timezone: "America/Mexico_City",
      bankName: null,
      bankBeneficiary: null,
      bankAccountNumber: null,
      bankClabe: null,
      bankNotes: null,
      soundAlertsEnabled: false,
      autoReplyEnabled: true,
      autoReplyDelayMs: 1000,
      welcomeMessage: "¡Hola! Bienvenido. Envíanos captura de lo que te gusta.",
      awayMessage: null,
      queueMessage: null,
      // Recordatorios automáticos (desactivados por defecto)
      reminderEnabled: false,
      reminderBeforeMinutes: 15,
      reminderDays: 7,
      autoExpireOrders: true,
      orderExpirationMinutes: 30,
      autoReleaseStock: true,
      businessHoursStart: "09:00",
      businessHoursEnd: "22:00",
    });
  }

  return NextResponse.json(config);
}

export const PUT = apiHandler<BusinessConfigInput>({
  body: businessConfigSchema,
  handler: async (_req, body) => {
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const settings = { ...(org?.settings as any), ...body };

    if (org) {
      await prisma.organization.update({
        where: { id: orgId },
        data: { settings },
      });
    } else {
      await prisma.organization.create({
        data: { id: orgId, name: "Default", settings },
      });
    }

    const updatedOrg = await prisma.organization.findUnique({ where: { id: orgId } });
    return NextResponse.json(updatedOrg?.settings);
  },
});
