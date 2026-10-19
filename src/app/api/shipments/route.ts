import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { shipmentCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

const TO_DISPATCH: string[] = ["PENDING", "READY", "LABEL_PRINTED"];
const IN_TRANSIT_STATUSES: string[] = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"];
const ISSUE_STATUSES: string[] = ["FAILED", "RETURNED", "LOST", "CANCELLED"];

const LIST_SELECT = {
  id: true,
  paymentOrderId: true,
  leadId: true,
  trackingNumber: true,
  carrier: true,
  mode: true,
  carrierId: true,
  service: true,
  weightGrams: true,
  costClp: true,
  labelUrl: true,
  trackingUrl: true,
  providerRef: true,
  status: true,
  shippedAt: true,
  deliveredAt: true,
  notes: true,
  attempts: true,
  createdAt: true,
  updatedAt: true,
  lead: {
    select: {
      id: true,
      name: true,
      phone: true,
      addressStreet: true,
      addressNumber: true,
      addressColonia: true,
      addressCity: true,
      addressState: true,
      addressZipCode: true,
      addressNotes: true,
    },
  },
  paymentOrder: { select: { id: true, concept: true } },
  carrierRef: { select: { id: true, name: true, mode: true, apiProvider: true } },
} as const;

export const GET = apiHandler({
  handler: async (req) => {
    const sp = req.nextUrl.searchParams;

    const statusParam = sp.get("status");
    const mode = sp.get("mode");
    const carrierId = sp.get("carrierId");
    const carrier = sp.get("carrier");
    const leadId = sp.get("leadId");
    const q = sp.get("q")?.trim();
    const exportAll = sp.get("export") === "1";
    const from = sp.get("from");
    const to = sp.get("to");

    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSizeRaw = Number(sp.get("pageSize")) || DEFAULT_PAGE_SIZE;
    const pageSize = PAGE_SIZES.includes(pageSizeRaw) ? pageSizeRaw : DEFAULT_PAGE_SIZE;

    const conditions: Record<string, unknown>[] = [];

    if (statusParam && statusParam !== "all") {
      const statuses = statusParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length === 1) conditions.push({ status: statuses[0] });
      else if (statuses.length > 1) conditions.push({ status: { in: statuses } });
    }

    if (mode) conditions.push({ mode });
    if (carrierId) conditions.push({ carrierId });
    if (leadId) conditions.push({ leadId });

    if (carrier) {
      conditions.push({ carrier: { contains: carrier, mode: "insensitive" } });
    }

    if (q) {
      conditions.push({
        OR: [
          { trackingNumber: { contains: q, mode: "insensitive" } },
          { carrier: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
          { lead: { name: { contains: q, mode: "insensitive" } } },
          { lead: { phone: { contains: q, mode: "insensitive" } } },
          { lead: { addressCity: { contains: q, mode: "insensitive" } } },
          { lead: { addressColonia: { contains: q, mode: "insensitive" } } },
        ],
      });
    }

    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to);
      conditions.push({ createdAt });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [rows, countRows] = await Promise.all([
      exportAll
        ? prisma.shipment.findMany({
            where,
            select: LIST_SELECT,
            orderBy: { createdAt: "desc" },
            take: 20000,
          })
        : prisma.shipment.findMany({
            where,
            select: LIST_SELECT,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
      prisma.shipment.groupBy({ by: ["status"], where, _count: { _all: true } }),
    ]);

    const byStatus = new Map<string, number>(
      countRows.map((r) => [r.status as string, r._count._all as number])
    );

    const countIn = (list: string[]) => list.reduce((sum, s) => sum + (byStatus.get(s) ?? 0), 0);

    const total = countRows.reduce((sum, r) => sum + (r._count._all as number), 0);

    const stats = {
      total,
      pending: countIn(TO_DISPATCH),
      inTransit: countIn(IN_TRANSIT_STATUSES),
      delivered: byStatus.get("DELIVERED") ?? 0,
      issues: countIn(ISSUE_STATUSES),
      byStatus: Object.fromEntries(countRows.map((r) => [r.status as string, r._count._all])),
    };

    if (exportAll) {
      return NextResponse.json({ items: rows, total, stats });
    }

    return NextResponse.json({
      items: rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      stats,
    });
  },
});

export const POST = apiHandler({
  body: shipmentCreateSchema,
  handler: async (_req, body) => {
    const { paymentOrderId, trackingNumber, carrier, notes } = body;

    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
    });

    if (!paymentOrder) {
      return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
    }

    const existing = await prisma.shipment.findUnique({
      where: { paymentOrderId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Este cobro ya tiene un envio registrado" },
        { status: 409 }
      );
    }

    const shipment = await prisma.shipment.create({
      data: {
        paymentOrderId,
        leadId: paymentOrder.leadId,
        trackingNumber: trackingNumber || null,
        carrier: carrier || null,
        notes: notes || null,
        status: "PENDING",
      },
      include: { lead: true, paymentOrder: true },
    });

    await prisma.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        status: "PENDING",
        source: "MANUAL",
        note: "Envio creado",
      },
    });

    return NextResponse.json(shipment);
  },
});
