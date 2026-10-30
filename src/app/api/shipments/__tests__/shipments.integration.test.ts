/**
 * Tests de integración para /api/shipments
 * Solo corren con TEST_DB=1 (CI con Postgres).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

import { GET as getShipments, POST as postShipment } from "@/app/api/shipments/route";
import {
  GET as getShipmentById,
  PATCH as patchShipment,
  DELETE as deleteShipment,
} from "@/app/api/shipments/[id]/route";

// Mock context para params - Next.js 15 usa Promise para params
function makeContext(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): NextRequest {
  return new NextRequest(url, {
    method: options.method || "GET",
    headers: { "content-type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

const describeDb = process.env.TEST_DB === "1" ? describe : describe.skip;

// Teléfono único por corrida para evitar conflictos de unique constraint
const TEST_PHONE = `+5255${String(Date.now()).slice(-8)}`;

let leadId = "";
let conversationId = "";
let paymentOrderId = "";
let shipmentId = "";

async function cleanupByPhone() {
  const leads = await prisma.lead.findMany({
    where: { phone: TEST_PHONE },
    select: { id: true },
  });
  const ids = leads.map((lead) => lead.id);
  if (ids.length === 0) return;

  await prisma.shipmentEvent.deleteMany({ where: { shipment: { leadId: { in: ids } } } });
  await prisma.shipment.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.paymentOrder.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.message.deleteMany({ where: { conversation: { leadId: { in: ids } } } });
  await prisma.conversation.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.lead.deleteMany({ where: { id: { in: ids } } });
}

async function setupOrder() {
  const lead = await prisma.lead.create({
    data: { phone: TEST_PHONE, name: "Cliente Test Envíos" },
  });
  leadId = lead.id;

  const conversation = await prisma.conversation.create({ data: { leadId: lead.id } });
  conversationId = conversation.id;

  const paymentOrder = await prisma.paymentOrder.create({
    data: {
      conversationId: conversation.id,
      leadId: lead.id,
      amount: 15000,
      concept: "Vestido Esmeralda T. M",
      currency: "MXN",
      status: "PENDING",
    },
  });
  paymentOrderId = paymentOrder.id;
}

beforeAll(async () => {
  if (process.env.TEST_DB === "1") await cleanupByPhone();
});

afterAll(async () => {
  if (process.env.TEST_DB === "1") await cleanupByPhone();
  await prisma.$disconnect();
});

describeDb("POST /api/shipments - Crear envío (con BD)", () => {
  it("debe crear un envío vinculado a un cobro", async () => {
    await setupOrder();

    const req = makeRequest("http://localhost:3001/api/shipments", {
      method: "POST",
      body: {
        paymentOrderId,
        trackingNumber: "TRK-000001",
        carrier: "Mensajeria Local",
        mode: "COURIER",
        notes: "Entregar en recepcion",
      },
    });
    const res = await postShipment(req, {} as any);

    expect(res.status).toBe(200);
    const shipment = await res.json();
    shipmentId = shipment.id;

    expect(shipment.paymentOrderId).toBe(paymentOrderId);
    expect(shipment.leadId).toBe(leadId);
    expect(shipment.status).toBe("PENDING");
    expect(shipment.trackingNumber).toBe("TRK-000001");
    expect(shipment.carrier).toBe("Mensajeria Local");
  });

  it("debe rechazar duplicar envío para el mismo cobro", async () => {
    const req = makeRequest("http://localhost:3001/api/shipments", {
      method: "POST",
      body: { paymentOrderId, trackingNumber: "TRK-DUP" },
    });
    const res = await postShipment(req, {} as any);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("ya tiene un envio");
  });
});

describeDb("GET /api/shipments - Listado y detalle (con BD)", () => {
  beforeAll(async () => {
    if (!shipmentId) await setupOrder();
  });

  it("debe listar envíos con paginación y estadísticas", async () => {
    const req = makeRequest("http://localhost:3001/api/shipments?page=1&pageSize=10");
    const res = await getShipments(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toBeInstanceOf(Array);
    expect(data.total).toBeTypeOf("number");
    expect(data.page).toBe(1);
    expect(data.stats).toBeDefined();
    expect(data.stats.total).toBeTypeOf("number");
  });

  it("debe filtrar envíos por leadId", async () => {
    const req = makeRequest(`http://localhost:3001/api/shipments?leadId=${leadId}`);
    const res = await getShipments(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items.every((item: any) => item.leadId === leadId)).toBe(true);
  });

  it("debe retornar detalle de un envío con relaciones", async () => {
    const req = makeRequest(`http://localhost:3001/api/shipments/${shipmentId}`);
    const res = await getShipmentById(req, makeContext({ id: shipmentId }));

    expect(res.status).toBe(200);
    const shipment = await res.json();
    expect(shipment.id).toBe(shipmentId);
    expect(shipment.lead).toBeDefined();
    expect(shipment.paymentOrder).toBeDefined();
    expect(shipment.events).toBeInstanceOf(Array);
  });

  it("debe retornar 404 para envío inexistente", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const req = makeRequest(`http://localhost:3001/api/shipments/${fakeId}`);
    const res = await getShipmentById(req, makeContext({ id: fakeId }));

    expect(res.status).toBe(404);
  });
});

describeDb("PATCH /api/shipments/[id] - Transiciones de estado (con BD)", () => {
  it("debe avanzar de PENDING a READY y luego a PICKED_UP", async () => {
    // PENDING -> READY
    let res = await patchShipment(
      makeRequest(`http://localhost:3001/api/shipments/${shipmentId}`, {
        method: "PATCH",
        body: { status: "READY" },
      }),
      makeContext({ id: shipmentId })
    );
    expect(res.status).toBe(200);
    let shipment = await res.json();
    expect(shipment.status).toBe("READY");

    // READY -> PICKED_UP (establece shippedAt automáticamente)
    res = await patchShipment(
      makeRequest(`http://localhost:3001/api/shipments/${shipmentId}`, {
        method: "PATCH",
        body: { status: "PICKED_UP", trackingNumber: "TRK-UPDATED" },
      }),
      makeContext({ id: shipmentId })
    );
    expect(res.status).toBe(200);
    shipment = await res.json();
    expect(shipment.status).toBe("PICKED_UP");
    expect(shipment.trackingNumber).toBe("TRK-UPDATED");
    expect(shipment.shippedAt).toBeDefined();

    // Verificar evento creado por el cambio de estado
    const events = await prisma.shipmentEvent.findMany({
      where: { shipmentId },
      orderBy: { occurredAt: "asc" },
    });
    expect(events.length).toBeGreaterThanOrEqual(1);
    const lastEvent = events[events.length - 1];
    expect(lastEvent.status).toBe("PICKED_UP");
    expect(lastEvent.source).toBe("MANUAL");
  });

  it("debe marcar como DELIVERED y establecer deliveredAt", async () => {
    const res = await patchShipment(
      makeRequest(`http://localhost:3001/api/shipments/${shipmentId}`, {
        method: "PATCH",
        body: { status: "DELIVERED", deliveredTo: "Recepcionista" },
      }),
      makeContext({ id: shipmentId })
    );

    expect(res.status).toBe(200);
    const shipment = await res.json();
    expect(shipment.status).toBe("DELIVERED");
    expect(shipment.deliveredAt).toBeDefined();
    expect(shipment.deliveredTo).toBe("Recepcionista");
  });

  it("debe rechazar estado inválido (Zod validación)", async () => {
    const res = await patchShipment(
      makeRequest(`http://localhost:3001/api/shipments/${shipmentId}`, {
        method: "PATCH",
        body: { status: "ESTADO_INVALIDO" },
      }),
      makeContext({ id: shipmentId })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validacion fallida");
  });
});

describeDb("DELETE /api/shipments/[id] - Eliminar envío (con BD)", () => {
  it("debe eliminar un envío y sus eventos", async () => {
    // Crear un envío adicional para eliminar
    const order2 = await prisma.paymentOrder.create({
      data: {
        conversationId,
        leadId,
        amount: 5000,
        concept: "Envío para eliminar",
        status: "PENDING",
      },
    });
    const shipment2 = await prisma.shipment.create({
      data: {
        paymentOrderId: order2.id,
        leadId,
        status: "PENDING",
      },
    });
    await prisma.shipmentEvent.create({
      data: { shipmentId: shipment2.id, status: "PENDING", source: "MANUAL", note: "Creado" },
    });

    const res = await deleteShipment(
      makeRequest(`http://localhost:3001/api/shipments/${shipment2.id}`, { method: "DELETE" }),
      makeContext({ id: shipment2.id })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);

    const exists = await prisma.shipment.findUnique({ where: { id: shipment2.id } });
    expect(exists).toBeNull();

    const events = await prisma.shipmentEvent.findMany({ where: { shipmentId: shipment2.id } });
    expect(events.length).toBe(0);

    await prisma.paymentOrder.delete({ where: { id: order2.id } }).catch(() => {});
  });

  it("debe retornar 404 para envío inexistente", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await deleteShipment(
      makeRequest(`http://localhost:3001/api/shipments/${fakeId}`, { method: "DELETE" }),
      makeContext({ id: fakeId })
    );

    expect(res.status).toBe(404);
  });
});
