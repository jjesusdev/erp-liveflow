const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function main() {
  console.log('Sembrando datos de ejemplo...');

  const operator = await prisma.operator.upsert({
    where: { email: 'admin@erp.local' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@erp.local',
      role: 'ADMIN',
      isOnline: true,
    },
  });

  await prisma.businessConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      businessName: 'Live Shop MX',
      currency: 'MXN',
      timezone: 'America/Mexico_City',
      businessHoursStart: '09:00',
      businessHoursEnd: '22:00',
      autoReplyEnabled: true,
      autoReplyDelayMs: 1200,
      welcomeMessage:
        'Hola! Gracias por escribirnos. En un momento te ayudamos con tu pedido.',
      awayMessage:
        'Ahora mismo estamos fuera de horario, te contestamos temprano.',
      queueMessage: 'Estamos Saturados, tu mensaje fue recibido.',
    },
  });

  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.createMany({
      data: [
        {
          name: 'Playera Oversize Negra',
          description: 'Algodon premium, talla M',
          price: 299,
          currency: 'MXN',
          category: 'Live',
          imageUrl: 'https://placehold.co/400x400/png?text=Playera',
        },
        {
          name: 'Gorra Oversize Beige',
          description: 'Unitario, borde curvo',
          price: 259,
          currency: 'MXN',
          category: 'Live',
          imageUrl: 'https://placehold.co/400x400/png?text=Gorra',
        },
        {
          name: 'Set de Calcetas Antideslizantes',
          description: 'Paquete de 3 pares',
          price: 199,
          currency: 'MXN',
          category: 'Accesorios',
        },
        {
          name: 'Mochila Urbana Compacta',
          description: 'Color azul marino',
          price: 549,
          currency: 'MXN',
          category: 'Accesorios',
          isAvailable: false,
        },
      ],
    });
    console.log('  Productos creados');
  }

  const now = Date.now();

  const seeds = [
    {
      phone: '5215551230011',
      name: 'Ana Ramirez',
      source: 'TikTok Live',
      lastInteractionAt: new Date(now - 0.5 * HOUR),
      status: 'NEW',
      texts: ['Hola, vi la playera negra en el live, sigue disponible?'],
    },
    {
      phone: '5215551230022',
      name: 'Carlos Mendoza',
      source: 'TikTok Live',
      lastInteractionAt: new Date(now - 3 * HOUR),
      status: 'ATTENTION',
      texts: [
        'Hola',
        'Quiero dos gorras, cuanto me sale el envio?',
        'Aceptan tarjeta?',
      ],
    },
    {
      phone: '5215551230033',
      name: 'Lucia Herrera',
      source: 'TikTok Ads',
      lastInteractionAt: new Date(now - 26 * HOUR),
      status: 'AWAITING_PAYMENT',
      texts: ['Buenas, me interesa el set de calcetas, como lo pago?'],
      payment: {
        amount: 199,
        concept: 'Set de calcetas antideslizantes',
        status: 'SENT',
      },
    },
    {
      phone: '5215551230044',
      name: 'Miguel Torres',
      source: 'TikTok Live',
      lastInteractionAt: new Date(now - 2 * DAY),
      status: 'PAID',
      texts: ['Perfecto, ya hice el pago'],
      payment: {
        amount: 299,
        concept: 'Playera oversize negra talla M',
        status: 'PAID',
        provider: 'MERCADOPAGO',
        providerLinkUrl:
          'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=demo',
      },
      shipment: {
        trackingNumber: 'MLM123456789MX',
        carrier: 'Mercado Envios',
        status: 'IN_TRANSIT',
      },
    },
    {
      phone: '5215551230055',
      name: 'Sofia Navarro',
      source: 'TikTok Live',
      lastInteractionAt: new Date(now - 5 * DAY),
      status: 'SHIPPED',
      texts: ['Gracias por el envio!'],
      payment: {
        amount: 549,
        concept: 'Mochila urbana compacta',
        status: 'PAID',
        provider: 'MERCADOPAGO',
        providerLinkUrl:
          'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=demo2',
      },
      shipment: {
        trackingNumber: 'MLM987654321MX',
        carrier: 'DHL',
        status: 'DELIVERED',
      },
    },
  ];

  for (const seed of seeds) {
    const lead = await prisma.lead.upsert({
      where: { phone: seed.phone },
      update: {},
      create: {
        phone: seed.phone,
        name: seed.name,
        source: seed.source,
        lastInteractionAt: seed.lastInteractionAt,
        firstContactAt: seed.lastInteractionAt,
      },
    });

    const existing = await prisma.conversation.findFirst({
      where: { leadId: lead.id },
    });

    if (existing) continue;

    const base = seed.lastInteractionAt.getTime();

    const conversation = await prisma.conversation.create({
      data: {
        leadId: lead.id,
        status: seed.status,
        assignedToId: operator.id,
        lastMessageAt: seed.lastInteractionAt,
        createdAt: seed.lastInteractionAt,
        firstResponseAt: seed.lastInteractionAt,
        messages: {
          create: seed.texts.map((content, i) => ({
            direction: i === 0 ? 'INBOUND' : 'OUTBOUND',
            type: 'TEXT',
            content,
            fromPhone: i === 0 ? seed.phone : null,
            sentAt: new Date(base - (seed.texts.length - i) * 60000),
          })),
        },
      },
    });

    if (seed.payment) {
      const p = seed.payment;
      await prisma.paymentOrder.create({
        data: {
          conversationId: conversation.id,
          leadId: lead.id,
          amount: p.amount,
          currency: 'MXN',
          concept: p.concept,
          status: p.status,
          provider: p.provider || 'MERCADOPAGO',
          providerLinkUrl: p.providerLinkUrl || null,
          createdById: operator.id,
          sentAt: p.status !== 'PENDING' ? seed.lastInteractionAt : null,
          paidAt: p.status === 'PAID' ? seed.lastInteractionAt : null,
        },
      });
    }

    if (seed.shipment) {
      const order = await prisma.paymentOrder.findFirst({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'desc' },
      });

      if (order) {
        const s = seed.shipment;
        await prisma.shipment.create({
          data: {
            paymentOrderId: order.id,
            leadId: lead.id,
            trackingNumber: s.trackingNumber,
            carrier: s.carrier,
            status: s.status,
            shippedAt: s.status === 'PENDING' ? null : seed.lastInteractionAt,
            deliveredAt:
              s.status === 'DELIVERED' ? seed.lastInteractionAt : null,
          },
        });
      }
    }
  }

  console.log('  Leads y conversaciones creados');

  const campaignCount = await prisma.campaign.count();
  if (campaignCount === 0) {
    await prisma.campaign.create({
      data: {
        name: 'Promo del fin de semana',
        message:
          'Hola! Este fin de semana tenemos 15% de descuento en todo el catalogo. Tu enlace de pago sigue vigente.',
        status: 'SENT',
        createdById: operator.id,
        sentAt: new Date(now - 2 * DAY),
        totalLeads: seeds.length,
        sentCount: seeds.length,
        failedCount: 0,
        recipients: {
          create: seeds.map((s) => ({
            lead: { connect: { phone: s.phone } },
            status: 'SENT',
            sentAt: new Date(now - 2 * DAY),
          })),
        },
      },
    });
    console.log('  Campana creada');
  }

  const totals = {
    leads: await prisma.lead.count(),
    conversations: await prisma.conversation.count(),
    messages: await prisma.message.count(),
    products: await prisma.product.count(),
    payments: await prisma.paymentOrder.count(),
    shipments: await prisma.shipment.count(),
    campaigns: await prisma.campaign.count(),
  };

  console.log('Seed completado:', totals);
}

main()
  .catch((error) => {
    console.error('Error en seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });