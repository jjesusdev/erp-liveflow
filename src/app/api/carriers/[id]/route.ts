import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { carrierUpdateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

export const GET = apiHandler({
  handler: async (_req, _body, context) => {
    const { id } = await context.params;

    const carrier = await prisma.carrier.findUnique({
      where: { id },
      include: { _count: { select: { shipments: true } } },
    });

    if (!carrier) {
      return NextResponse.json({ error: "Carrier no encontrado" }, { status: 404 });
    }

    return NextResponse.json(carrier);
  },
});

export const PATCH = apiHandler({
  body: carrierUpdateSchema,
  handler: async (_req, body, context) => {
    const { id } = await context.params;

    const existing = await prisma.carrier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Carrier no encontrado" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.code !== undefined) data.code = body.code;
    if (body.name !== undefined) data.name = body.name;
    if (body.mode !== undefined) data.mode = body.mode;
    if (body.apiProvider !== undefined) data.apiProvider = body.apiProvider;
    if (body.active !== undefined) data.active = body.active;
    if (body.config !== undefined) data.config = body.config ?? undefined;

    const carrier = await prisma.carrier.update({ where: { id }, data });
    return NextResponse.json(carrier);
  },
});

export const DELETE = apiHandler({
  handler: async (_req, _body, context) => {
    const { id } = await context.params;

    const existing = await prisma.carrier.findUnique({
      where: { id },
      include: { _count: { select: { shipments: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Carrier no encontrado" }, { status: 404 });
    }

    if (existing._count.shipments > 0) {
      await prisma.carrier.update({ where: { id }, data: { active: false } });
      return NextResponse.json({ ok: true, deactivated: true });
    }

    await prisma.carrier.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  },
});
