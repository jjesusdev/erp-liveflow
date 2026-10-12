import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";

export const POST = apiHandler({
  handler: async () => {
    // Find demo leads by source marker
    const demoLeads = await prisma.lead.findMany({
      where: { source: "DEMO" },
      select: { id: true },
    });

    if (demoLeads.length === 0) {
      return NextResponse.json({ error: "No hay datos demo para limpiar" }, { status: 404 });
    }

    const demoLeadIds = demoLeads.map((l) => l.id);

    // Find demo conversations (linked to demo leads)
    const demoConversations = await prisma.conversation.findMany({
      where: { leadId: { in: demoLeadIds } },
      select: { id: true },
    });
    const demoConvIds = demoConversations.map((c) => c.id);

    // Find demo payment orders
    const demoPayments = await prisma.paymentOrder.findMany({
      where: { leadId: { in: demoLeadIds } },
      select: { id: true },
    });
    const demoPaymentIds = demoPayments.map((p) => p.id);

    // Delete in reverse dependency order (children first)
    // 1. Shipments (depend on PaymentOrder + Lead)
    await prisma.shipment.deleteMany({
      where: { leadId: { in: demoLeadIds } },
    });

    // 2. Messages (depend on Conversation)
    await prisma.message.deleteMany({
      where: { conversationId: { in: demoConvIds } },
    });

    // 3. PaymentOrders (depend on Conversation + Lead)
    await prisma.paymentOrder.deleteMany({
      where: { id: { in: demoPaymentIds } },
    });

    // 4. Conversations (depend on Lead)
    await prisma.conversation.deleteMany({
      where: { id: { in: demoConvIds } },
    });

    // 5. Leads (the marker source = "DEMO")
    await prisma.lead.deleteMany({
      where: { id: { in: demoLeadIds } },
    });

    // 6. Products (marker category starts with "DEMO-")
    const deletedProducts = await prisma.product.deleteMany({
      where: { category: { startsWith: "DEMO-" } },
    });

    // 7. Live Sessions (marker notes starts with "[DEMO]")
    const deletedSessions = await prisma.liveSession.deleteMany({
      where: { notes: { startsWith: "[DEMO]" } },
    });

    // 8. Activity Log marker
    await prisma.activityLog.deleteMany({
      where: { action: "DEMO_SEED" },
    });

    // 9. Demo operator (only if they have no remaining data)
    await prisma.operator.deleteMany({
      where: { email: "admin@liveflow.cl" },
    });

    return NextResponse.json({
      success: true,
      deleted: {
        leads: demoLeadIds.length,
        conversations: demoConvIds.length,
        paymentOrders: demoPaymentIds.length,
        products: deletedProducts.count,
        liveSessions: deletedSessions.count,
      },
    });
  },
});
