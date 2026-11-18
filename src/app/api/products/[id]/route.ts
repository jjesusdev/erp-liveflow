import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { productUpdateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/session";
import { whereOrg } from "@/lib/org";

export const GET = apiHandler({
  handler: async (req: NextRequest, _body, context) => {
    const { id } = await context.params;
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const product = await prisma.product.findFirst({
      where: { ...whereOrg(orgId), id },
    });

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ...product, price: Number(product.price) });
  },
});

export const PUT = apiHandler({
  body: productUpdateSchema,
  handler: async (req: NextRequest, body, context) => {
    const { id } = await context.params;
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const existing = await prisma.product.findFirst({ where: { ...whereOrg(orgId), id } });
    if (!existing) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const data: any = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.category !== undefined) data.category = body.category || null;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.isAvailable !== undefined) data.isAvailable = Boolean(body.isAvailable);
    if (body.price !== undefined) data.price = body.price;

    const product = await prisma.product.update({
      where: { ...whereOrg(orgId), id },
      data,
    });

    return NextResponse.json({ ...product, price: Number(product.price) });
  },
});

export const DELETE = apiHandler({
  handler: async (req: NextRequest, _body, context) => {
    const { id } = await context.params;
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const existing = await prisma.product.findFirst({ where: { ...whereOrg(orgId), id } });
    if (!existing) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    await prisma.product.delete({ where: { ...whereOrg(orgId), id } });

    return NextResponse.json({ deleted: true });
  },
});
