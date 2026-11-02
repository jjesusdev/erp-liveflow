import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { productCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/session";
import { whereOrg } from "@/lib/org";

export const GET = apiHandler({
  handler: async (req: NextRequest) => {
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const searchParams = req.nextUrl.searchParams;
    const available = searchParams.get("available");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: any = { ...whereOrg(orgId) };

    if (available !== null) {
      where.isAvailable = available === "true";
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      products.map((product) => ({ ...product, price: Number(product.price) }))
    );
  },
});

export const POST = apiHandler({
  body: productCreateSchema,
  handler: async (req: NextRequest, body) => {
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const { name, description, price, currency, imageUrl, category, isAvailable } = body;

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price,
        currency: currency || "MXN",
        imageUrl: imageUrl || null,
        category: category || null,
        isAvailable: isAvailable ?? true,
        orgId,
      },
    });

    return NextResponse.json({ ...product, price: Number(product.price) });
  },
});
