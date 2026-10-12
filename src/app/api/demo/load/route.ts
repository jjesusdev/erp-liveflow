import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import {
  DEMO_LEADS,
  DEMO_PRODUCTS,
  DEMO_MESSAGES,
  DEMO_OPERATOR,
  DEMO_BUSINESS_CONFIG,
} from "@/lib/demo-data";

export const POST = apiHandler({
  handler: async () => {
    // Check if demo data already exists
    const existingDemoLeads = await prisma.lead.count({ where: { source: "DEMO" } });
    if (existingDemoLeads > 0) {
      return NextResponse.json({ error: "Los datos demo ya están cargados" }, { status: 409 });
    }

    // Check if there's real data (block demo if real data exists)
    const totalLeads = await prisma.lead.count();
    if (totalLeads > 0) {
      return NextResponse.json(
        { error: "Hay datos reales en la base. El modo demo solo funciona en una base vacía." },
        { status: 409 }
      );
    }

    // 1. Operator
    const operator = await prisma.operator.upsert({
      where: { email: DEMO_OPERATOR.email },
      update: {},
      create: DEMO_OPERATOR,
    });

    // 2. Business Config
    await prisma.businessConfig.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", ...DEMO_BUSINESS_CONFIG },
    });

    // 3. Live Sessions
    const activeSession = await prisma.liveSession.create({
      data: {
        title: "Live Flash Sale Viernes",
        platform: "TIKTOK",
        status: "ACTIVE",
        startedAt: new Date(Date.now() - 45 * 60 * 1000),
        notes: "[DEMO] Sesión activa de prueba",
      },
    });

    await prisma.liveSession.create({
      data: {
        title: "Live Catálogo Semana 12",
        platform: "INSTAGRAM",
        status: "ENDED",
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        notes: "[DEMO] Sesión finalizada de prueba",
      },
    });

    // 4. Products
    const products = await Promise.all(
      DEMO_PRODUCTS.map((p) =>
        prisma.product.create({ data: { ...p, isActive: true, isAvailable: true } })
      )
    );

    // 5. Leads
    const leads = await Promise.all(
      DEMO_LEADS.map((l) =>
        prisma.lead.create({
          data: {
            ...l,
            firstContactAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            lastInteractionAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          },
        })
      )
    );

    // 6. Conversations + Messages
    const conversations = await Promise.all(
      leads.map(async (lead, i) => {
        const messages = DEMO_MESSAGES[lead.phone as keyof typeof DEMO_MESSAGES] || [];
        const lastMsgMinutes = messages.length > 0 ? messages[messages.length - 1].minutesAgo : 60;

        // Determine conversation status based on lead index
        const statuses = [
          "AWAITING_PAYMENT",
          "PAID",
          "SHIPPED",
          "ATTENTION",
          "AWAITING_PAYMENT",
          "NEW",
          "NEW",
          "ATTENTION",
        ] as const;
        const status = statuses[i % statuses.length];

        const conversation = await prisma.conversation.create({
          data: {
            leadId: lead.id,
            status,
            assignedToId: operator.id,
            lastMessageAt: new Date(Date.now() - lastMsgMinutes * 60 * 1000),
            createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
          },
        });

        // Create messages
        if (messages.length > 0) {
          await prisma.message.createMany({
            data: messages.map((m) => ({
              conversationId: conversation.id,
              direction: m.direction,
              type: "TEXT" as const,
              content: m.content,
              sentAt: new Date(Date.now() - m.minutesAgo * 60 * 1000),
              fromPhone: m.direction === "INBOUND" ? lead.phone : undefined,
            })),
          });
        }

        return conversation;
      })
    );

    // 7. Payment Orders
    const paymentOrdersData = [
      {
        convIdx: 0,
        amount: 45990,
        concept: "Vestido Esmeralda",
        status: "PENDING" as const,
        provider: "TRANSFER" as const,
      },
      {
        convIdx: 1,
        amount: 65990,
        concept: "Vestido Negro Gala",
        status: "PAID" as const,
        provider: "TRANSFER" as const,
        paidMinutesAgo: 270,
      },
      {
        convIdx: 2,
        amount: 38990,
        concept: "Conjunto Linen Natural",
        status: "PAID" as const,
        provider: "MERCADOPAGO" as const,
        paidMinutesAgo: 580,
      },
      {
        convIdx: 3,
        amount: 24990,
        concept: "Falda Midi Plisada",
        status: "SENT" as const,
        provider: "TRANSFER" as const,
      },
      {
        convIdx: 4,
        amount: 14990,
        concept: "Top Crop Floral",
        status: "PENDING" as const,
        provider: "TRANSFER" as const,
      },
      {
        convIdx: 7,
        amount: 14990,
        concept: "Top Crop Floral",
        status: "EXPIRED" as const,
        provider: "TRANSFER" as const,
      },
    ];

    const paymentOrders = await Promise.all(
      paymentOrdersData.map(async (po) => {
        const conv = conversations[po.convIdx];
        if (!conv) return null;
        const lead = leads[po.convIdx];
        return prisma.paymentOrder.create({
          data: {
            conversationId: conv.id,
            leadId: lead.id,
            liveSessionId: activeSession.id,
            amount: po.amount,
            concept: po.concept,
            status: po.status,
            provider: po.provider,
            createdById: operator.id,
            createdAt: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000),
            paidAt: po.paidMinutesAgo ? new Date(Date.now() - po.paidMinutesAgo * 60 * 1000) : null,
            sentAt:
              po.status !== "PENDING"
                ? new Date(Date.now() - Math.random() * 60 * 60 * 1000)
                : null,
          },
        });
      })
    );

    // 8. Shipments (for paid orders)
    const paidOrders = paymentOrders.filter((po) => po && po.status === "PAID");
    if (paidOrders.length >= 1 && paidOrders[0]) {
      await prisma.shipment.create({
        data: {
          paymentOrderId: paidOrders[0].id,
          leadId: paidOrders[0].leadId,
          carrier: "Estafeta",
          trackingNumber: "ES" + Math.floor(Math.random() * 900000000 + 100000000) + "CL",
          status: "IN_TRANSIT",
          shippedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      });
    }
    if (paidOrders.length >= 2 && paidOrders[1]) {
      await prisma.shipment.create({
        data: {
          paymentOrderId: paidOrders[1].id,
          leadId: paidOrders[1].leadId,
          carrier: "Starken",
          trackingNumber: "STK" + Math.floor(Math.random() * 900000000 + 100000000),
          status: "DELIVERED",
          shippedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      });
    }

    // 9. Activity Log marker
    await prisma.activityLog.create({
      data: {
        operatorId: operator.id,
        action: "DEMO_SEED",
        details: {
          leads: leads.length,
          products: products.length,
          conversations: conversations.length,
          paymentOrders: paymentOrders.filter(Boolean).length,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        leads: leads.length,
        products: products.length,
        conversations: conversations.length,
        paymentOrders: paymentOrders.filter(Boolean).length,
        shipments: paidOrders.length,
        liveSessions: 2,
      },
    });
  },
});
