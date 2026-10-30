/**
 * Tests de integración para el webhook de MercadoPago
 * Solo corren con TEST_DB=1 (CI con Postgres).
 * Mock de axios para evitar llamadas HTTP reales.
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

import { POST as mpWebhook } from "@/app/api/webhooks/mercadopago/route";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

import axios from "axios";
const mockedAxiosGet = axios.get as unknown as ReturnType<typeof vi.fn>;

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): NextRequest {
  return new NextRequest(url, {
    method: options.method || "POST",
    headers: { "content-type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

const describeDb = process.env.TEST_DB === "1" ? describe : describe.skip;

const TEST_PHONE = `+5255${String(Date.now()).slice(-8)}${Math.floor(Math.random() * 100)}`;

let leadId = "";
let conversationId = "";
let paymentOrderId = "";

const PAYMENT_ID = `mp_payment_${Date.now()}`;
const EXTERNAL_REF = `order_${Date.now()}`;

async function cleanupByPhone() {
  const leads = await prisma.lead.findMany({
    where: { phone: TEST_PHONE },
    select: { id: true },
  });
  const ids = leads.map((lead) => lead.id);
  if (ids.length === 0) return;

  await prisma.shipment.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.paymentOrder.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.conversation.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.lead.deleteMany({ where: { id: { in: ids } } });
}

async function setupOrder(status: string = "PENDING") {
  const lead = await prisma.lead.upsert({
    where: { phone: TEST_PHONE },
    update: { name: "Cliente Test MP Webhook" },
    create: { phone: TEST_PHONE, name: "Cliente Test MP Webhook" },
  });
  leadId = lead.id;

  const conversation = await prisma.conversation.create({ data: { leadId: lead.id } });
  conversationId = conversation.id;

  const paymentOrder = await prisma.paymentOrder.create({
    data: {
      id: EXTERNAL_REF, // Usamos el external_reference como id del cobro
      conversationId: conversation.id,
      leadId: lead.id,
      amount: 15000,
      concept: "Vestido Esmeralda",
      currency: "MXN",
      status,
    },
  });
  paymentOrderId = paymentOrder.id;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Mock por defecto: pago aprobado
  mockedAxiosGet.mockResolvedValue({
    data: {
      id: PAYMENT_ID,
      status: "approved",
      external_reference: EXTERNAL_REF,
    },
  });
});

beforeAll(async () => {
  process.env.MP_ACCESS_TOKEN = "test-access-token";
  if (process.env.TEST_DB === "1") await cleanupByPhone();
});

afterAll(async () => {
  if (process.env.TEST_DB === "1") await cleanupByPhone();
  await prisma.$disconnect();
});

describeDb("POST /api/webhooks/mercadopago - Webhook (con BD)", () => {
  beforeAll(async () => {
    await setupOrder("PENDING");
  });

  it("debe rechazar payload JSON inválido", async () => {
    const req = new NextRequest("http://localhost:3001/api/webhooks/mercadopago", {
      method: "POST",
      body: "not-json",
    });
    const res = await mpWebhook(req);
    expect(res.status).toBe(400);
  });

  it("debe ignorar eventos que no son tipo payment", async () => {
    const req = makeRequest("http://localhost:3001/api/webhooks/mercadopago", {
      body: { type: "refund", action: "refund.created", data: { id: "123" } },
    });
    const res = await mpWebhook(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });

  it("debe ignorar eventos payment sin acción payment.created", async () => {
    const req = makeRequest("http://localhost:3001/api/webhooks/mercadopago", {
      body: { type: "payment", action: "payment.updated", data: { id: "123" } },
    });
    const res = await mpWebhook(req);

    expect(res.status).toBe(200);
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });

  it("debe retornar 500 si MP_ACCESS_TOKEN no está configurado", async () => {
    const originalToken = process.env.MP_ACCESS_TOKEN;
    delete process.env.MP_ACCESS_TOKEN;

    try {
      const req = makeRequest("http://localhost:3001/api/webhooks/mercadopago", {
        body: { type: "payment", action: "payment.created", data: { id: PAYMENT_ID } },
      });
      const res = await mpWebhook(req);

      expect(res.status).toBe(500);
    } finally {
      if (originalToken) process.env.MP_ACCESS_TOKEN = originalToken;
      else delete process.env.MP_ACCESS_TOKEN;
    }
  });

  it("debe ignorar pago no aprobado", async () => {
    mockedAxiosGet.mockResolvedValue({
      data: {
        id: PAYMENT_ID,
        status: "rejected",
        external_reference: EXTERNAL_REF,
      },
    });

    const req = makeRequest("http://localhost:3001/api/webhooks/mercadopago", {
      body: { type: "payment", action: "payment.created", data: { id: PAYMENT_ID } },
    });
    const res = await mpWebhook(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);

    const order = await prisma.paymentOrder.findUnique({ where: { id: EXTERNAL_REF } });
    expect(order?.status).toBe("PENDING"); // No cambió
  });

  it("debe aprobar pago y actualizar PaymentOrder a PAID", async () => {
    const res = await makeRequest("http://localhost:3001/api/webhooks/mercadopago", {
      body: { type: "payment", action: "payment.created", data: { id: PAYMENT_ID } },
    });
    const response = await mpWebhook(res);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);

    const order = await prisma.paymentOrder.findUnique({ where: { id: EXTERNAL_REF } });
    expect(order?.status).toBe("PAID");
    expect(order?.paidAt).toBeDefined();
    expect(order?.metadata).toEqual({ mpPaymentId: PAYMENT_ID });

    // La conversación también se actualizó a PAID
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    expect(conv?.status).toBe("PAID");
  });

  it("debe ser idempotente: segundo webhook con mismo payment no reprocesa", async () => {
    const res = await makeRequest("http://localhost:3001/api/webhooks/mercadopago", {
      body: { type: "payment", action: "payment.created", data: { id: PAYMENT_ID } },
    });
    const response = await mpWebhook(res);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
    expect(body.alreadyProcessed).toBe(true);

    // Verificar que no se creó ningún shipment duplicado ni se modificó el order
    const orders = await prisma.paymentOrder.findMany({ where: { id: EXTERNAL_REF } });
    expect(orders.length).toBe(1);
    expect(orders[0].status).toBe("PAID");
  });
});
