import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { carrierCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

const CARRIER_PROVIDERS = [
  { code: "MANUAL", label: "Manual / sin API", requiresConfig: false, supportsTracking: false },
  { code: "CHILEXPRESS", label: "Chilexpress", requiresConfig: true, supportsTracking: true },
  { code: "BLUE", label: "Blue Express", requiresConfig: true, supportsTracking: true },
  { code: "STARKEN", label: "Starken", requiresConfig: true, supportsTracking: true },
  { code: "CORREOS", label: "Correos de Chile", requiresConfig: true, supportsTracking: true },
  { code: "SHIPIT", label: "Shipit (agregador)", requiresConfig: true, supportsTracking: true },
  { code: "ENVIAME", label: "Enviame (agregador)", requiresConfig: true, supportsTracking: true },
  {
    code: "SIMPLIROUTE",
    label: "SimpliRoute (flota propia)",
    requiresConfig: true,
    supportsTracking: true,
  },
  {
    code: "BEETRACK",
    label: "Beetrack (flota propia)",
    requiresConfig: true,
    supportsTracking: true,
  },
] as const;

export const GET = apiHandler({
  handler: async (req) => {
    const sp = req.nextUrl.searchParams;
    const includeInactive = sp.get("all") === "1";
    const mode = sp.get("mode");

    const where: Record<string, unknown> = {};
    if (!includeInactive) where.active = true;
    if (mode) where.mode = mode;

    const carriers = await prisma.carrier.findMany({
      where,
      orderBy: [{ createdAt: "asc" }],
    });

    if (sp.get("meta") === "1") {
      return NextResponse.json({ items: carriers, providers: CARRIER_PROVIDERS });
    }

    return NextResponse.json({ items: carriers });
  },
});

export const POST = apiHandler({
  body: carrierCreateSchema,
  handler: async (_req, body) => {
    const existing = await prisma.carrier.findFirst({
      where: { orgId: null, code: body.code },
    });

    if (existing) {
      return NextResponse.json({ error: "Ya existe un carrier con ese codigo" }, { status: 409 });
    }

    const carrier = await prisma.carrier.create({
      data: {
        orgId: null,
        code: body.code,
        name: body.name,
        mode: body.mode,
        apiProvider: body.apiProvider ?? "MANUAL",
        active: body.active ?? true,
        config: (body.config as object | undefined) ?? undefined,
      },
    });

    return NextResponse.json(carrier, { status: 201 });
  },
});
