import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { businessConfigSchema, type BusinessConfigInput } from "@/lib/schemas";

export async function GET() {
  const org = await prisma.organization.findFirst();
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
    const org = await prisma.organization.findFirst();
    const settings = { ...(org?.settings as any), ...body };

    if (org) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { settings },
      });
    } else {
      await prisma.organization.create({
        data: { id: "default-org", name: "Default", settings },
      });
    }

    const updatedOrg = await prisma.organization.findFirst();
    return NextResponse.json(updatedOrg?.settings);
  },
});
