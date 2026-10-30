/**
 * Tests de integración para /api/caja
 * Solo corren con TEST_DB=1 (CI con Postgres).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

import { GET as getCaja } from "@/app/api/caja/route";
import { POST as sweepRecovery } from "@/app/api/caja/sweep-recovery/route";

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

const TEST_PHONE = `+5255${String(Date.now()).slice(-8)}${Math.floor(Math.random() * 100)}`;

let leadId = "";
let conversationId = "";
const orderIds: string[] = [];

async function setupOrders() {
  const lead = await prisma.lead.upsert({
    where: { phone: TEST_PHONE },
    update: { name: "Cliente Test Caja" },
    create: { phone: TEST_PHONE, name: "Cliente Test Caja" },
  });
  leadId = lead.id;

  const conversation = await prisma.conversation.create({ data: { leadId: lead.id } });
  conversationId = conversation.id;

  // Crear cobros en distintos estados y proveedores
  const orders = [
    { status: "PAID", provider: "MERCADOPAGO", concept: "Pago aprobado 1", amount: 10000 },
    { status: "PAID", provider: "TRANSFER", concept: "Pago aprobado 2", amount: 20000 },
    { status: "PENDING", provider: "MERCADOPAGO", concept: "Pago pendiente", amount: 15000 },
    { status: "EXPIRED", provider: "TRANSFER", concept: "Pago expirado", amount: 5000 },
  ];

  for (const o of orders) {
    const order = await prisma.paymentOrder.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        ...o,
      },
    });
    orderIds.push(order.id);
  }
}

async function cleanupByPhone() {
  const leads = await prisma.lead.findMany({
    where: { phone: TEST_PHONE },
    select: { id: true },
  });
  const ids = leads.map((lead) => lead.id);
  if (ids.length === 0) return;

  await prisma.paymentOrder.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.conversation.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.lead.deleteMany({ where: { id: { in: ids } } });
}

beforeAll(async () => {
  if (process.env.TEST_DB === "1") await cleanupByPhone();
});

afterAll(async () => {
  if (process.env.TEST_DB === "1") await cleanupByPhone();
  await prisma.$disconnect();
});

describeDb("GET /api/caja - Listado de cobros (con BD)", () => {
  beforeAll(async () => {
    await setupOrders();
  });

  it("debe listar todos los cobros con montos como número", async () => {
    const req = makeRequest("http://localhost:3001/api/caja");
    const res = await getCaja(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toBeInstanceOf(Array);
    expect(data.length).toBeGreaterThanOrEqual(4);
    // Verificar que amount viene como número
    const paid = data.find((o: any) => o.concept === "Pago aprobado 1");
    expect(paid).toBeDefined();
    expect(typeof paid.amount).toBe("number");
    expect(paid.amount).toBe(10000);
  });

  it("debe filtrar por status PAID", async () => {
    const req = makeRequest("http://localhost:3001/api/caja?status=PAID");
    const res = await getCaja(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(2);
    expect(data.every((o: any) => o.status === "PAID")).toBe(true);
  });

  it("debe filtrar por status PENDING", async () => {
    const req = makeRequest("http://localhost:3001/api/caja?status=PENDING");
    const res = await getCaja(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.every((o: any) => o.status === "PENDING")).toBe(true);
  });

  it("debe filtrar por proveedor MERCADOPAGO", async () => {
    const req = makeRequest("http://localhost:3001/api/caja?provider=MERCADOPAGO");
    const res = await getCaja(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(2);
    expect(data.every((o: any) => o.provider === "MERCADOPAGO")).toBe(true);
  });

  it("debe buscar por concepto", async () => {
    const req = makeRequest("http://localhost:3001/api/caja?search=aprobado");
    const res = await getCaja(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(2);
    expect(data.every((o: any) => o.concept.includes("aprobado"))).toBe(true);
  });

  it("debe filtrar por rango today", async () => {
    const req = makeRequest("http://localhost:3001/api/caja?range=today");
    const res = await getCaja(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toBeInstanceOf(Array);
    // Los cobros creados hoy deben aparecer
    const todayOrders = data.filter((o: any) => o.concept.includes("Pago"));
    expect(todayOrders.length).toBeGreaterThanOrEqual(1);
  });

  it("debe incluir lead y conversation en el resultado", async () => {
    const req = makeRequest("http://localhost:3001/api/caja");
    const res = await getCaja(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    const first = data[0];
    expect(first.lead).toBeDefined();
    expect(first.lead.phone).toBe(TEST_PHONE);
  });
});

describeDb("POST /api/caja/sweep-recovery - Recuperación masiva (con BD)", () => {
  beforeAll(async () => {
    await setupOrders();
  });

  it("debe retornar count 0 si no hay pedidos pendientes (todos pagados)", async () => {
    // Marcar todos como PAID para que no haya pendientes
    await prisma.paymentOrder.updateMany({
      where: { leadId },
      data: { status: "PAID" },
    });

    const req = makeRequest("http://localhost:3001/api/caja/sweep-recovery", {
      method: "POST",
      body: { discountPercent: 0 },
    });
    const res = await sweepRecovery(req, {} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    // Sin WhatsApp client configurado, no se envía ningún mensaje
    expect(body.recoveredCount).toBe(0);
    expect(body.success).toBe(true);
  });

  it("debe ejecutar sweep sin WhatsApp client (modo simulado)", async () => {
    // Resetear a PENDING
    await prisma.paymentOrder.updateMany({
      where: { leadId, status: "PAID" },
      data: { status: "PENDING" },
    });

    const req = makeRequest("http://localhost:3001/api/caja/sweep-recovery", {
      method: "POST",
      body: { discountPercent: 10, customMessage: "Mensaje de prueba" },
    });
    const res = await sweepRecovery(req, {} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.totalPending).toBeGreaterThanOrEqual(1);
    // Sin WhatsApp client configurado, recoveredCount es 0
    expect(body.recoveredCount).toBe(0);
  });
});
