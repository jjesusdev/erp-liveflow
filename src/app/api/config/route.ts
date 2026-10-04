import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Error fetching config' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    const config = await prisma.businessConfig.upsert({
      where: { id: 'default' },
      update: body,
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
        awayMessage: body.awayMessage,
        queueMessage: body.queueMessage,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Error updating config' }, { status: 500 });
  }
}
