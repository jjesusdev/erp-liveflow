import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarrierProvider, registerCarrierProvider, type CarrierProvider } from "@/lib/carriers";
import { POST as syncTracking } from "@/app/api/shipments/[id]/sync-tracking/route";

const describeDb = process.env.TEST_DB === "1" ? describe : describe.skip;
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TEST_PHONE = `+5255${String(Date.now()).slice(-8)}`;

function makeRequest() {
  return new NextRequest("http://localhost:3001/api/shipments/x/sync-tracking", {
    method: "POST",
  });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describeDb("POST /api/shipments/[id]/sync-tracking (con BD)", () => {
  let leadId = "";
  let conversationId = "";
  let manualCarrierId = "";
  let shipitCarrierId = "";
  let enviameCarrierId = "";
  let beetrackCarrierId = "";
  let manualShipmentId = "";
  let shipitShipmentId = "";
  let enviameShipmentId = "";
  let noCarrierShipmentId = "";
  let errorShipmentId = "";
  const orderIds: string[] = [];
  const shipmentIds: string[] = [];
  const originalBeetrack = getCarrierProvider("BEETRACK");

  async function createShipment(carrierId: string | null, providerRef: string | null) {
    const order = await prisma.paymentOrder.create({
      data: {
        conversationId,
        leadId,
        amount: 100,
        concept: `Test ${RUN_ID}`,
        status: "PENDING",
      },
    });
    orderIds.push(order.id);

    const shipment = await prisma.shipment.create({
      data: {
        paymentOrderId: order.id,
        leadId,
        carrierId,
        providerRef,
        status: "PENDING",
      },
    });
    shipmentIds.push(shipment.id);
    return shipment.id;
  }

  beforeAll(async () => {
    const lead = await prisma.lead.create({
      data: { phone: TEST_PHONE, name: "Test sync tracking" },
    });
    leadId = lead.id;

    const conversation = await prisma.conversation.create({ data: { leadId } });
    conversationId = conversation.id;

    const manualCarrier = await prisma.carrier.create({
      data: {
        code: `TEST-MANUAL-${RUN_ID}`,
        name: "Manual Test",
        mode: "COURIER",
        apiProvider: "MANUAL",
      },
    });
    manualCarrierId = manualCarrier.id;

    const shipitCarrier = await prisma.carrier.create({
      data: {
        code: `TEST-SHIPIT-${RUN_ID}`,
        name: "Shipit Test",
        mode: "COURIER",
        apiProvider: "SHIPIT",
        config: { apiKey: "k", apiSecret: "s" },
      },
    });
    shipitCarrierId = shipitCarrier.id;

    const enviameCarrier = await prisma.carrier.create({
      data: {
        code: `TEST-ENVIAME-${RUN_ID}`,
        name: "Enviame Test",
        mode: "COURIER",
        apiProvider: "ENVIAME",
      },
    });
    enviameCarrierId = enviameCarrier.id;

    const beetrackCarrier = await prisma.carrier.create({
      data: {
        code: `TEST-BEETRACK-${RUN_ID}`,
        name: "Beetrack Test",
        mode: "COURIER",
        apiProvider: "BEETRACK",
      },
    });
    beetrackCarrierId = beetrackCarrier.id;

    manualShipmentId = await createShipment(manualCarrierId, "manual-ref");
    shipitShipmentId = await createShipment(shipitCarrierId, "shipit-ref");
    enviameShipmentId = await createShipment(enviameCarrierId, "enviame-ref");
    noCarrierShipmentId = await createShipment(null, null);
    errorShipmentId = await createShipment(beetrackCarrierId, "beetrack-ref");

    const throwingProvider: CarrierProvider = {
      code: "BEETRACK",
      name: "Beetrack que falla",
      supportedModes: ["COURIER"],
      canQuote: false,
      canPrintLabel: false,
      canTrack: true,
      canWebhook: false,
      requiredConfig: [],
      async createShipment() {
        throw new Error("no implementado");
      },
      async track() {
        throw new Error("proveedor caido");
      },
    };
    registerCarrierProvider(throwingProvider);
  });

  afterAll(async () => {
    if (originalBeetrack) registerCarrierProvider(originalBeetrack);

    await prisma.shipmentEvent.deleteMany({ where: { shipmentId: { in: shipmentIds } } });
    await prisma.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
    await prisma.paymentOrder.deleteMany({ where: { id: { in: orderIds } } });
    if (conversationId) await prisma.conversation.deleteMany({ where: { id: conversationId } });
    if (leadId) await prisma.lead.deleteMany({ where: { id: leadId } });
    await prisma.carrier.deleteMany({
      where: {
        id: {
          in: [manualCarrierId, shipitCarrierId, enviameCarrierId, beetrackCarrierId].filter(
            Boolean
          ),
        },
      },
    });
  });

  it("retorna 404 si el envío no existe", async () => {
    const res = await syncTracking(
      makeRequest(),
      makeContext("00000000-0000-0000-0000-000000000000")
    );
    expect(res.status).toBe(404);
  });

  it("retorna 400 si el envío no tiene carrier", async () => {
    const res = await syncTracking(makeRequest(), makeContext(noCarrierShipmentId));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("carrier");
  });

  it("retorna 400 si el proveedor no soporta tracking", async () => {
    const res = await syncTracking(makeRequest(), makeContext(enviameShipmentId));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("no soporta tracking");
  });

  it("sincroniza un envío MANUAL sin eventos nuevos", async () => {
    const res = await syncTracking(makeRequest(), makeContext(manualShipmentId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toEqual([]);
    expect(body.shipment.id).toBe(manualShipmentId);
  });

  it("registra el error del proveedor como ShipmentEvent", async () => {
    const res = await syncTracking(makeRequest(), makeContext(errorShipmentId));
    expect(res.status).toBe(502);

    const event = await prisma.shipmentEvent.findFirst({
      where: { shipmentId: errorShipmentId, source: "API" },
      orderBy: { occurredAt: "desc" },
    });
    expect(event?.note).toContain("Error al sincronizar tracking");
    expect(event?.note).toContain("proveedor caido");
  });
});
