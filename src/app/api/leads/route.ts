import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { leadCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

function normalizePhone(raw: string) {
  // Conserva el + inicial y elimina espacios/guiones/paréntesis.
  const plus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return (plus ? "+" : "") + digits;
}

export const GET = apiHandler({
  handler: async (req: NextRequest) => {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const phone = searchParams.get("phone");

    const where: any = {};

    if (phone) {
      where.phone = { contains: phone };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        conversations: {
          orderBy: { createdAt: "desc" },
        },
        paymentOrders: {
          orderBy: { createdAt: "desc" },
        },
        shipments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ lastInteractionAt: { sort: "desc", nulls: "last" } }],
    });

    return NextResponse.json(
      leads.map((lead) => {
        const paidOrders = lead.paymentOrders.filter((o) => o.status === "PAID");
        const totalPaidCount = paidOrders.length;
        const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);

        let tier: "VIP" | "FREQUENT" | "NEW" | "GHOST" = "NEW";
        if (totalPaidCount >= 3 || totalSpent >= 2000) {
          tier = "VIP";
        } else if (totalPaidCount >= 1) {
          tier = "FREQUENT";
        } else {
          const hasExpiredOrCancelled = lead.paymentOrders.some(
            (o) => o.status === "EXPIRED" || o.status === "CANCELLED"
          );
          if (hasExpiredOrCancelled) {
            tier = "GHOST";
          }
        }

        return {
          ...lead,
          tier,
          totalPaidCount,
          totalSpent,
          paymentOrders: lead.paymentOrders.map((order) => ({
            ...order,
            amount: Number(order.amount),
          })),
        };
      })
    );
  },
});

export const POST = apiHandler({
  body: leadCreateSchema,
  handler: async (req: NextRequest, body) => {
    const phone = normalizePhone(String(body.phone || ""));

    if (!phone || phone.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ error: "Telefono invalido (minimo 8 digitos)" }, { status: 400 });
    }

    const existing = await prisma.lead.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un cliente con ese telefono" }, { status: 409 });
    }

    const lead = await prisma.lead.create({
      data: {
        phone,
        name: body.name?.trim() || null,
        source: body.source?.trim() || "manual",
        lastInteractionAt: new Date(),
      },
    });

    return NextResponse.json(lead, { status: 201 });
  },
});
