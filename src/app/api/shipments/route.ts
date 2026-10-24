import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { shipmentCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { getCarrierProvider, type CreateShipmentContext } from "@/lib/carriers";
import type { ShipmentMode } from "@prisma/client";

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

/**
 * Construye el contexto para crear un envío en el carrier provider
 */
async function buildCreateShipmentContext(
  shipmentId: string,
  paymentOrder: {
    id: string;
    leadId: string;
    concept: string;
    amount: number;
    currency: string;
  },
  lead: {
    id: string;
    name: string | null;
    phone: string;
    addressStreet: string | null;
    addressNumber: string | null;
    addressColonia: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressZipCode: string | null;
    addressNotes: string | null;
  },
  body: {
    trackingNumber?: string | null;
    carrier?: string | null;
    carrierId?: string | null;
    mode?: ShipmentMode | null;
    service?: string | null;
    weightGrams?: number | null;
    notes?: string | null;
  },
  carrierConfig: Record<string, unknown> = {}
): Promise<CreateShipmentContext> {
  return {
    shipmentId,
    trackingNumber: body.trackingNumber ?? undefined,
    carrierName: body.carrier ?? undefined,
    recipient: {
      name: lead.name ?? "Sin nombre",
      phone: lead.phone,
      email: undefined,
    },
    address: {
      street: lead.addressStreet ?? "",
      number: lead.addressNumber ?? "",
      colonia: lead.addressColonia ?? undefined,
      city: lead.addressCity ?? "",
      state: lead.addressState ?? "",
      zipCode: lead.addressZipCode ?? "",
      notes: lead.addressNotes ?? undefined,
    },
    dimensions: undefined,
    weightGrams: body.weightGrams ?? undefined,
    carrierConfig,
    mode: body.mode ?? "COURIER",
  };
}

export const POST = apiHandler({
  body: shipmentCreateSchema,
  handler: async (_req, body) => {
    const {
      paymentOrderId,
      trackingNumber,
      carrier,
      notes,
      carrierId,
      mode,
      service,
      weightGrams,
    } = body;

    // Obtener paymentOrder con lead
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: { lead: true },
    });

    if (!paymentOrder) {
      return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
    }

    if (!paymentOrder.lead) {
      return NextResponse.json({ error: "Cliente no encontrado en el cobro" }, { status: 404 });
    }

    // Verificar si ya existe envío para este cobro
    const existing = await prisma.shipment.findUnique({
      where: { paymentOrderId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Este cobro ya tiene un envio registrado" },
        { status: 409 }
      );
    }

    // Obtener carrier si se proporcionó carrierId
    let carrierRef = null;
    let carrierConfig: Record<string, unknown> = {};

    if (carrierId) {
      carrierRef = await prisma.carrier.findUnique({
        where: { id: carrierId },
      });

      if (!carrierRef) {
        return NextResponse.json({ error: "Carrier no encontrado" }, { status: 404 });
      }

      if (!carrierRef.active) {
        return NextResponse.json({ error: "Carrier inactivo" }, { status: 400 });
      }

      carrierConfig = (carrierRef.config as Record<string, unknown>) ?? {};
    }

    // Crear el shipment inicial en PENDING
    const shipment = await prisma.shipment.create({
      data: {
        paymentOrderId,
        leadId: paymentOrder.leadId,
        trackingNumber: trackingNumber || null,
        carrier: carrier || carrierRef?.name || null,
        mode: mode ?? null,
        carrierId: carrierId ?? null,
        service: service || null,
        weightGrams: weightGrams ?? null,
        notes: notes || null,
        status: "PENDING",
      },
      include: { lead: true, paymentOrder: true, carrierRef: true },
    });

    // Si hay carrier con provider, intentar crear en el proveedor
    let providerResult = null;
    if (carrierRef?.apiProvider) {
      const provider = getCarrierProvider(carrierRef.apiProvider);

      if (provider) {
        try {
          const ctx = await buildCreateShipmentContext(
            shipment.id,
            {
              id: paymentOrder.id,
              leadId: paymentOrder.leadId,
              concept: paymentOrder.concept,
              amount: Number(paymentOrder.amount),
              currency: paymentOrder.currency,
            },
            {
              id: paymentOrder.lead.id,
              name: paymentOrder.lead.name,
              phone: paymentOrder.lead.phone,
              addressStreet: paymentOrder.lead.addressStreet,
              addressNumber: paymentOrder.lead.addressNumber,
              addressColonia: paymentOrder.lead.addressColonia,
              addressCity: paymentOrder.lead.addressCity,
              addressState: paymentOrder.lead.addressState,
              addressZipCode: paymentOrder.lead.addressZipCode,
              addressNotes: paymentOrder.lead.addressNotes,
            },
            {
              trackingNumber,
              carrier: carrierRef.name,
              carrierId,
              mode: mode ?? "COURIER",
              service,
              weightGrams,
              notes,
            },
            carrierConfig
          );

          providerResult = await provider.createShipment(ctx);

          // Actualizar shipment con datos del provider
          await prisma.shipment.update({
            where: { id: shipment.id },
            data: {
              trackingNumber: providerResult.trackingNumber,
              carrier: carrierRef.name,
              providerRef: providerResult.providerRef,
              labelUrl: providerResult.labelUrl ?? null,
              trackingUrl: providerResult.trackingUrl ?? null,
              service: providerResult.service ?? null,
              costClp: providerResult.costClp ?? null,
            },
          });
        } catch (providerError) {
          console.error(
            `[Carrier ${carrierRef.apiProvider}] Error creating shipment:`,
            providerError
          );
          // No fallar la creación, solo loguear - el usuario puede reintentar
        }
      }
    }

    // Crear evento inicial
    await prisma.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        status: "PENDING",
        source: "MANUAL",
        note: carrierRef ? `Envio creado via ${carrierRef.name}` : "Envio creado",
      },
    });

    // Retornar shipment actualizado
    const updatedShipment = await prisma.shipment.findUnique({
      where: { id: shipment.id },
      include: { lead: true, paymentOrder: true, carrierRef: true },
    });

    return NextResponse.json(updatedShipment);
  },
});
