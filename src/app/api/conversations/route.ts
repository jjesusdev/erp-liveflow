import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { parseEnum, CONVERSATION_STATUSES } from "@/lib/enums";

export const GET = apiHandler({
  handler: async (req) => {
    const searchParams = req.nextUrl.searchParams;
    const rawStatus = searchParams.get("status");
    const status = parseEnum(CONVERSATION_STATUSES, rawStatus);

    if (rawStatus !== null && !status) {
      return NextResponse.json({ error: "Estado de conversacion invalido" }, { status: 400 });
    }

    const where: Prisma.ConversationWhereInput = status
      ? { status }
      : {
          status: {
            in: ["NEW", "ATTENTION", "AWAITING_PAYMENT", "PAID", "SHIPPED"],
          },
        };

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        lead: {
          include: {
            paymentOrders: {
              where: { status: "PAID" },
              select: { id: true, amount: true },
            },
          },
        },
        messages: {
          orderBy: { sentAt: "desc" },
          take: 1,
        },
        paymentOrders: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }],
      take: 100,
    });

    return NextResponse.json(
      conversations.map((conversation) => {
        const paidOrders = conversation.lead?.paymentOrders || [];
        const totalPaidCount = paidOrders.length;
        const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);

        let tier: "VIP" | "FREQUENT" | "NEW" = "NEW";
        if (totalPaidCount >= 3 || totalSpent >= 2000) {
          tier = "VIP";
        } else if (totalPaidCount >= 1) {
          tier = "FREQUENT";
        }

        return {
          ...conversation,
          lead: conversation.lead
            ? {
                ...conversation.lead,
                tier,
                totalPaidCount,
                totalSpent,
              }
            : null,
          paymentOrders: conversation.paymentOrders.map((order) => ({
            ...order,
            amount: Number(order.amount),
          })),
        };
      })
    );
  },
});
