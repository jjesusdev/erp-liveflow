import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const HOUR = 60 * 60 * 1000;
    const now = Date.now();

    const operator = await prisma.operator.upsert({
      where: { email: 'admin@erp.local' },
      update: {},
      create: {
        name: 'Mariana',
        email: 'admin@erp.local',
        role: 'ADMIN',
        isOnline: true,
      },
    });

    const demoLeads = [
      {
        phone: '+52 55 4120 8833',
        name: 'Daniela Ríos',
        tier: 'VIP',
        status: 'AWAITING_PAYMENT',
        texts: [
          'Holaa! Quiero el vestido satinado verde, el #14 del live 💚',
          'Hola Dani! Te lo aparto 30 min. Talla M disponible. Total $450 MXN con envío incluido.',
          'Ya te mandé el comprobante 🙌',
        ],
        amount: 450,
        concept: 'Vestido satinado esmeralda Talla M',
        imageUrl: '/images/comprobante.png',
      },
      {
        phone: '+52 33 1987 6620',
        name: 'Fernanda López',
        tier: 'FREQUENT',
        status: 'NEW',
        texts: ['Quiero el vestido verde talla M y una blusa blanca porfa'],
      },
      {
        phone: '+52 81 2245 1109',
        name: 'Ana Sofía Treviño',
        tier: 'NEW',
        status: 'NEW',
        texts: ['¿Hacen envíos a Monterrey? ¿Cuánto tarda en llegar?'],
      },
      {
        phone: '+52 55 6610 2741',
        name: 'Karla Méndez',
        tier: 'VIP',
        status: 'ATTENTION',
        texts: ['Apártame la blusa crema porfa, ya te paso mis datos'],
      },
      {
        phone: '+52 55 3300 1472',
        name: 'Mónica Salas',
        tier: 'FREQUENT',
        status: 'PAID',
        texts: ['Ya quedó la transferencia!', '¡Pago confirmado! Tu pedido sale mañana ✨'],
        amount: 620,
        concept: 'Top tejido arena + Falda',
        paid: true,
      },
    ];

    for (const d of demoLeads) {
      const lead = await prisma.lead.upsert({
        where: { phone: d.phone },
        update: {
          name: d.name,
          addressStreet: 'Av. Hidalgo',
          addressNumber: '123 Int 4',
          addressColonia: 'Centro',
          addressCity: 'Guadalajara',
          addressState: 'Jalisco',
          addressZipCode: '44100',
          internalNotes: 'Clienta frecuente de Live Shopping, paga puntual.',
        },
        create: {
          phone: d.phone,
          name: d.name,
          source: 'tiktok_live',
          addressStreet: 'Av. Hidalgo',
          addressNumber: '123 Int 4',
          addressColonia: 'Centro',
          addressCity: 'Guadalajara',
          addressState: 'Jalisco',
          addressZipCode: '44100',
          internalNotes: 'Clienta frecuente de Live Shopping, paga puntual.',
          lastInteractionAt: new Date(now - Math.floor(Math.random() * 60) * 60000),
        },
      });

      let conv = await prisma.conversation.findFirst({
        where: { leadId: lead.id },
      });

      if (!conv) {
        conv = await prisma.conversation.create({
          data: {
            leadId: lead.id,
            status: d.status as any,
            assignedToId: operator.id,
            lastMessageAt: new Date(),
          },
        });
      }

      for (let i = 0; i < d.texts.length; i++) {
        const text = d.texts[i];
        await prisma.message.create({
          data: {
            conversationId: conv.id,
            direction: i % 2 === 0 ? 'INBOUND' : 'OUTBOUND',
            type: 'TEXT',
            content: text,
            fromPhone: i % 2 === 0 ? d.phone : null,
            sentAt: new Date(now - (d.texts.length - i) * 120000),
          },
        });
      }

      if (d.imageUrl) {
        await prisma.message.create({
          data: {
            conversationId: conv.id,
            direction: 'INBOUND',
            type: 'IMAGE',
            mediaUrl: d.imageUrl,
            mediaType: 'image/png',
            content: 'Comprobante de pago',
            sentAt: new Date(now - 60000),
          },
        });
      }

      if (d.amount) {
        await prisma.paymentOrder.create({
          data: {
            conversationId: conv.id,
            leadId: lead.id,
            amount: d.amount,
            currency: 'MXN',
            concept: d.concept || 'Prendas del Live',
            status: d.paid ? 'PAID' : 'PENDING',
            provider: 'TRANSFER',
            createdById: operator.id,
            expiresAt: new Date(now + 25 * 60 * 1000),
            paidAt: d.paid ? new Date() : null,
          },
        });
      }
    }

    await logActivity({
      action: 'DEMO_CHATS_SEEDED',
      details: { count: demoLeads.length },
    });

    return NextResponse.json({ success: true, seededCount: demoLeads.length });
  } catch (error) {
    console.error('Error seeding demo chats:', error);
    return NextResponse.json({ error: 'Error cargando datos demo' }, { status: 500 });
  }
}