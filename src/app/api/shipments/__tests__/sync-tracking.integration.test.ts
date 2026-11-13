import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarrierProvider, registerCarrierProvider, type CarrierProvider } from "@/lib/carriers";
import { POST as syncTracking } from "@/app/api/shipments/[id]/sync-tracking/route";

// Mock de getOperatorContext para tests que necesitan session
vi.mock("@/lib/session", () => ({
  getOperatorContext: vi.fn().mockResolvedValue(null),
}));

import { getOperatorContext } from "@/lib/session";

const describeDb = process.env.TEST_DB === "1" ? describe : describe.skip;
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TEST_PHONE = `+5255${String(Date.now()).slice(-8)}`;

let testOrgId: string;

function makeRequest() {
  return new NextRequest("http://localhost:3001/api/shipments/x/sync-tracking", {
    method: "POST",
  });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

/**
 * Fija la sesión devuelta por getOperatorContext para tests con BD.
 */
function setTestSession(orgId: string, operatorId = "test-operator") {
  (getOperatorContext as ReturnType<typeof vi.fn>).mockResolvedValue({
    operatorId,
    orgId,
    role: "ADMIN",
  });
}

async function ensureTestOrg() {
  const org = await prisma.organization.upsert({
    where: { slug: "test-org-sync" },
    update: { name: "Test Org Sync", isActive: true, settings: {} },
    create: {
      name: "Test Org Sync",
      slug: "test-org-sync",
      isActive: true,
      settings: {},
    },
  });
  testOrgId = org.id;
  return testOrgId;
}

describeDb("POST /api/shipments/[id]/sync-tracking (con BD)", () => {
  let leadId = "";
  let conversationId = "";
  let manualCarrierId = "";
  let noTrackingCarrierId = "";
  let shipitCarrierId = "";
  let beetrackCarrierId = "";
  let manualShipmentId = "";
  let noTrackingShipmentId = "";
  let shipitShipmentId = "";
  let noCarrierShipmentId = "";
  let errorShipmentId = "";
  const orderIds: string[] = [];
  const shipmentIds: string[] = [];
  const originalBeetrack = getCarrierProvider("BEETRACK");
  const originalSimpliroute = getCarrierProvider("SIMPLIROUTE");

  async function createShipment(carrierId: string | null, providerRef: string | null) {
    const order = await prisma.paymentOrder.create({
      data: {
        conversationId,
        leadId,
        orgId: testOrgId,
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
        orgId: testOrgId,
        carrierId,
        providerRef,
        status: "PENDING",
      },
    });
    shipmentIds.push(shipment.id);
    return shipment.id;
  }

  beforeAll(async () => {
    await ensureTestOrg();
    setTestSession(testOrgId);

    const lead = await prisma.lead.create({
      data: { phone: TEST_PHONE, name: "Test sync tracking", orgId: testOrgId },
    });
    leadId = lead.id;

    const conversation = await prisma.conversation.create({
      data: { leadId, orgId: testOrgId },
    });
    conversationId = conversation.id;

    const manualCarrier = await prisma.carrier.create({
      data: {
        orgId: testOrgId,
        code: `TEST-MANUAL-${RUN_ID}`,
        name: "Manual Test",
        mode: "COURIER",
        apiProvider: "MANUAL",
      },
    });
    manualCarrierId = manualCarrier.id;

    const shipitCarrier = await prisma.carrier.create({
      data: {
        orgId: testOrgId,
        code: `TEST-SHIPIT-${RUN_ID}`,
        name: "Shipit Test",
        mode: "COURIER",
        apiProvider: "SHIPIT",
        config: { apiKey: "k", apiSecret: "s" },
      },
    });
    shipitCarrierId = shipitCarrier.id;

    // Proveedor sin `track` para el caso "no soporta tracking".
    // Se reutiliza el código SIMPLIROUTE porque todos los providers reales
    // ya implementan tracking (Shipit lo sumó en la fase de carriers).
    const noTrackingProvider: CarrierProvider = {
      code: "SIMPLIROUTE",
      name: "SimpliRoute sin tracking",
      supportedModes: ["COURIER"],
      canQuote: false,
      canPrintLabel: false,
      canTrack: false,
      canWebhook: false,
      requiredConfig: [],
      async createShipment() {
        throw new Error("no implementado");
      },
    };
    registerCarrierProvider(noTrackingProvider);

    const noTrackingCarrier = await prisma.carrier.create({
      data: {
        orgId: testOrgId,
        code: `TEST-NOTRACK-${RUN_ID}`,
        name: "Sin tracking Test",
        mode: "COURIER",
        apiProvider: "SIMPLIROUTE",
      },
    });
    noTrackingCarrierId = noTrackingCarrier.id;

    const beetrackCarrier = await prisma.carrier.create({
      data: {
        orgId: testOrgId,
        code: `TEST-BEETRACK-${RUN_ID}`,
        name: "Beetrack Test",
        mode: "COURIER",
        apiProvider: "BEETRACK",
      },
    });
    beetrackCarrierId = beetrackCarrier.id;

    manualShipmentId = await createShipment(manualCarrierId, "manual-ref");
    noTrackingShipmentId = await createShipment(noTrackingCarrierId, "notrack-ref");
    shipitShipmentId = await createShipment(shipitCarrierId, "shipit-ref");
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
    if (originalSimpliroute) registerCarrierProvider(originalSimpliroute);

    await prisma.shipmentEvent.deleteMany({ where: { shipmentId: { in: shipmentIds } } });
    await prisma.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
    await prisma.paymentOrder.deleteMany({ where: { id: { in: orderIds } } });
    if (conversationId) await prisma.conversation.deleteMany({ where: { id: conversationId } });
    if (leadId) await prisma.lead.deleteMany({ where: { id: leadId } });
    await prisma.carrier.deleteMany({
      where: {
        id: {
          in: [manualCarrierId, noTrackingCarrierId, shipitCarrierId, beetrackCarrierId].filter(
            Boolean
          ),
        },
      },
    });
    if (testOrgId) await prisma.organization.deleteMany({ where: { id: testOrgId } });
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
    const res = await syncTracking(makeRequest(), makeContext(noTrackingShipmentId));
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
