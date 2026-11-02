const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Generar hash scrypt para el password del operator (mismo algoritmo que auth.ts)
const crypto = require("crypto");

const SALT_BYTES = 16;
const KEY_BYTES = 32;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const derivedKey = crypto.scryptSync(password, salt, KEY_BYTES);
  const combined = Buffer.concat([salt, derivedKey]);
  return combined.toString("base64");
}

const ADMIN_PASSWORD_HASH = hashPassword("admin123");
const VENDEDORA_PASSWORD_HASH = hashPassword("vendedora123");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function main() {
  console.log("Sembrando datos de ejemplo...");

  // 1. Organización de demostración (idempotente por slug)
  //    Nota: BusinessConfig fue eliminada y su info vive ahora en Organization.settings.
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: { name: "Demo LiveFlow", isActive: true, settings: {} },
    create: {
      name: "Demo LiveFlow",
      slug: "demo",
      isActive: true,
      settings: {},
    },
  });

  const orgId = org.id;

  // 2. Operadores de ejemplo asociados a la organización (orgId requerido)
  const admin = await prisma.operator.upsert({
    where: { email: "admin@erp.local" },
    update: { orgId, role: "ADMIN", isOnline: true },
    create: {
      name: "Administrador",
      email: "admin@erp.local",
      role: "ADMIN",
      isOnline: true,
      orgId,
      passwordHash: ADMIN_PASSWORD_HASH,
    },
  });

  const vendedora = await prisma.operator.upsert({
    where: { email: "vendedora@erp.local" },
    update: { orgId, role: "AGENT", isOnline: true },
    create: {
      name: "Vendedora Demo",
      email: "vendedora@erp.local",
      role: "AGENT",
      isOnline: true,
      orgId,
      passwordHash: VENDEDORA_PASSWORD_HASH,
    },
  });

  // 3. Productos de la organización (idempotente: solo si no hay productos de esta org)
  const productCount = await prisma.product.count({
    where: { orgId },
  });
  if (productCount === 0) {
    await prisma.product.createMany({
      data: [
        {
          orgId,
          name: "Playera Oversize Negra",
          description: "Algodon premium, talla M",
          price: 299,
          currency: "MXN",
          category: "Live",
          imageUrl: "https://placehold.co/400x400/png?text=Playera",
        },
        {
          orgId,
          name: "Gorra Oversize Beige",
          description: "Unitario, borde curvo",
          price: 259,
          currency: "MXN",
          category: "Live",
          imageUrl: "https://placehold.co/400x400/png?text=Gorra",
        },
        {
          orgId,
          name: "Set de Calcetas Antideslizantes",
          description: "Paquete de 3 pares",
          price: 199,
          currency: "MXN",
          category: "Accesorios",
        },
        {
          orgId,
          name: "Mochila Urbana Compacta",
          description: "Color azul marino",
          price: 549,
          currency: "MXN",
          category: "Accesorios",
          isAvailable: false,
        },
      ],
    });
    console.log("  Productos creados");
  }

  const now = Date.now();

  const seeds = [
    {
      phone: "5215551230011",
      name: "Ana Ramirez",
      source: "TikTok Live",
      lastInteractionAt: new Date(now - 0.5 * HOUR),
      status: "NEW",
      texts: ["Hola, vi la playera negra en el live, sigue disponible?"],
    },
    {
      phone: "5215551230022",
      name: "Carlos Mendoza",
      source: "TikTok Live",
      lastInteractionAt: new Date(now - 3 * HOUR),
      status: "ATTENTION",
      texts: ["Hola", "Quiero dos gorras, cuanto me sale el envio?", "Aceptan tarjeta?"],
    },
    {
      phone: "5215551230033",
      name: "Lucia Herrera",
      source: "TikTok Ads",
      lastInteractionAt: new Date(now - 26 * HOUR),
      status: "AWAITING_PAYMENT",
      texts: ["Buenas, me interesa el set de calcetas, como lo pago?"],
      payment: {
        amount: 199,
        concept: "Set de calcetas antideslizantes",
        status: "SENT",
      },
    },
    {
      phone: "5215551230044",
      name: "Miguel Torres",
      source: "TikTok Live",
      lastInteractionAt: new Date(now - 2 * DAY),
      status: "PAID",
      texts: ["Perfecto, ya hice el pago"],
      payment: {
        amount: 299,
        concept: "Playera oversize negra talla M",
        status: "PAID",
        provider: "MERCADOPAGO",
        providerLinkUrl: "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=demo",
      },
      shipment: {
        trackingNumber: "MLM123456789MX",
        carrier: "Mercado Envios",
        status: "IN_TRANSIT",
      },
    },
    {
      phone: "5215551230055",
      name: "Sofia Navarro",
      source: "TikTok Live",
      lastInteractionAt: new Date(now - 5 * DAY),
      status: "SHIPPED",
      texts: ["Gracias por el envio!"],
      payment: {
        amount: 549,
        concept: "Mochila urbana compacta",
        status: "PAID",
        provider: "MERCADOPAGO",
        providerLinkUrl: "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=demo2",
      },
      shipment: {
        trackingNumber: "MLM987654321MX",
        carrier: "DHL",
        status: "DELIVERED",
      },
    },
  ];

  for (const seed of seeds) {
    const lead = await prisma.lead.upsert({
      where: { phone: seed.phone },
      update: { orgId },
      create: {
        phone: seed.phone,
        name: seed.name,
        source: seed.source,
        lastInteractionAt: seed.lastInteractionAt,
        firstContactAt: seed.lastInteractionAt,
        orgId,
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
        orgId,
        status: seed.status,
        assignedToId: admin.id,
        lastMessageAt: seed.lastInteractionAt,
        createdAt: seed.lastInteractionAt,
        firstResponseAt: seed.lastInteractionAt,
        messages: {
          create: seed.texts.map((content, i) => ({
            direction: i === 0 ? "INBOUND" : "OUTBOUND",
            type: "TEXT",
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
          orgId,
          amount: p.amount,
          currency: "MXN",
          concept: p.concept,
          status: p.status,
          provider: p.provider || "MERCADOPAGO",
          providerLinkUrl: p.providerLinkUrl || null,
          createdById: admin.id,
          sentAt: p.status !== "PENDING" ? seed.lastInteractionAt : null,
          paidAt: p.status === "PAID" ? seed.lastInteractionAt : null,
        },
      });
    }

    if (seed.shipment) {
      const order = await prisma.paymentOrder.findFirst({
        where: { leadId: lead.id, orgId },
        orderBy: { createdAt: "desc" },
      });

      if (order) {
        const s = seed.shipment;
        await prisma.shipment.create({
          data: {
            paymentOrderId: order.id,
            leadId: lead.id,
            orgId,
            trackingNumber: s.trackingNumber,
            carrier: s.carrier,
            status: s.status,
            shippedAt: s.status === "PENDING" ? null : seed.lastInteractionAt,
            deliveredAt: s.status === "DELIVERED" ? seed.lastInteractionAt : null,
          },
        });
      }
    }
  }

  console.log("  Leads y conversaciones creados");

  // 4. Campaña de la organización (idempotente: solo si no hay campañas de esta org)
  const campaignCount = await prisma.campaign.count({
    where: { orgId },
  });
  if (campaignCount === 0) {
    await prisma.campaign.create({
      data: {
        orgId,
        name: "Promo del fin de semana",
        message:
          "Hola! Este fin de semana tenemos 15% de descuento en todo el catalogo. Tu enlace de pago sigue vigente.",
        status: "SENT",
        createdById: admin.id,
        sentAt: new Date(now - 2 * DAY),
        totalLeads: seeds.length,
        sentCount: seeds.length,
        failedCount: 0,
        recipients: {
          create: seeds.map((s) => ({
            lead: { connect: { phone: s.phone } },
            status: "SENT",
            sentAt: new Date(now - 2 * DAY),
          })),
        },
      },
    });
    console.log("  Campana creada");
  }

  const totals = {
    orgId,
    leads: await prisma.lead.count({ where: { orgId } }),
    conversations: await prisma.conversation.count({ where: { orgId } }),
    messages: await prisma.message.count({ where: { orgId } }),
    products: await prisma.product.count({ where: { orgId } }),
    payments: await prisma.paymentOrder.count({ where: { orgId } }),
    shipments: await prisma.shipment.count({ where: { orgId } }),
    campaigns: await prisma.campaign.count({ where: { orgId } }),
  };

  console.log("Seed completado:", totals);
}

main()
  .catch((error) => {
    console.error("Error en seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
