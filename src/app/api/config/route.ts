import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler } from '@/lib/api-handler';
import { businessConfigSchema, type BusinessConfigInput } from '@/lib/schemas';

export async function GET() {
  const config = await prisma.businessConfig.findFirst();

  if (!config) {
    return NextResponse.json({
      businessName: 'Mi Negocio',
      currency: 'MXN',
      timezone: 'America/Mexico_City',
      bankName: null,
      bankBeneficiary: null,
      bankAccountNumber: null,
      bankClabe: null,
      bankNotes: null,
      soundAlertsEnabled: false,
      autoReplyEnabled: true,
      autoReplyDelayMs: 1000,
      welcomeMessage: '¡Hola! Bienvenido. Envíanos captura de lo que te gusta.',
      awayMessage: null,
      queueMessage: null,
    });
  }

  return NextResponse.json(config);
}

/** Converts nullable string fields to Prisma-compatible update format. */
function toPrismaUpdate(body: BusinessConfigInput) {
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === null) {
      update[key] = { set: null };
    } else if (value !== undefined) {
      update[key] = value;
    }
  }
  return update;
}

export const PUT = apiHandler<BusinessConfigInput>({
  body: businessConfigSchema,
  handler: async (_req, body) => {
    const config = await prisma.businessConfig.upsert({
      where: { id: 'default' },
      update: toPrismaUpdate(body),
      create: {
        id: 'default',
        businessName: body.businessName || 'Mi Negocio',
        currency: body.currency || 'MXN',
        timezone: body.timezone || 'America/Mexico_City',
        bankName: body.bankName || null,
        bankBeneficiary: body.bankBeneficiary || null,
        bankAccountNumber: body.bankAccountNumber || null,
        bankClabe: body.bankClabe || null,
        bankNotes: body.bankNotes || null,
        soundAlertsEnabled: body.soundAlertsEnabled ?? false,
        autoReplyEnabled: body.autoReplyEnabled ?? true,
        autoReplyDelayMs: body.autoReplyDelayMs ?? 1000,
        welcomeMessage: body.welcomeMessage || '¡Hola! Bienvenido.',
        awayMessage: body.awayMessage ?? null,
        queueMessage: body.queueMessage ?? null,
      },
    });

    return NextResponse.json(config);
  },
});
