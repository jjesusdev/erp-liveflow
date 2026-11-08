/**
 * Tests de integración para /api/caja/reminders
 * Solo corren con TEST_DB=1 (CI con Postgres).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

import { GET as getReminders, POST as sendReminders } from "@/app/api/caja/reminders/route";

const describeDb = process.env.TEST_DB === "1" ? describe : describe.skip;

const TEST_PHONE = `+5255${String(Date.now()).slice(-8)}${Math.floor(Math.random() * 100)}`;

let leadId = "";
let conversationId = "";
const orderIds: string[] = [];

async function setupOrdersWithExpiration() {
  const lead = await prisma.lead.upsert({
    where: { phone: TEST_PHONE },
    update: { name: "Cliente Test Recordatorios" },
    create: { phone: TEST_PHONE, name: "Cliente Test Recordatorios" },
  });
  leadId = lead.id;

  const conversation = await prisma.conversation.create({ data: { leadId: lead.id } });
  conversationId = conversation.id;

  // Crear órdenes con diferentes estados y expiraciones
  const now = new Date();
  const orders = [
    {
      status: "PENDING" as const,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000), // 30 min
      concept: "Orden próxima a expirar",
      amount: 15000,
    },
    {
      status: "SENT" as const,
      expiresAt: new Date(now.getTime() + 45 * 60 * 1000), // 45 min
      concept: "Orden pendiente confirmación",
      amount: 25000,
    },
    {
      status: "PAID" as const,
      expiresAt: new Date(now.getTime() - 10 * 60 * 1000), // Ya expiró
      concept: "Order ya pagada",
      amount: 10000,
    },
  ];

  for (const o of orders) {
    const order = await prisma.paymentOrder.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        status: o.status,
        concept: o.concept,
        amount: o.amount,
        expiresAt: o.expiresAt,
        currency: "MXN",
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

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): NextRequest {
  return new NextRequest(url, {
    method: options.method || "GET",
    headers: { "content-type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

beforeAll(async () => {
  if (process.env.TEST_DB === "1") await cleanupByPhone();
});

afterAll(async () => {
  if (process.env.TEST_DB === "1") await cleanupByPhone();
  await prisma.$disconnect();
});

describeDb("GET /api/caja/reminders - Estado de recordatorios", () => {
  beforeAll(async () => {
    // Habilitar recordatorios en la organización
    const org = await prisma.organization.findFirst();
    if (org) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          settings: {
            ...(org.settings as any),
            reminderEnabled: true,
            reminderBeforeMinutes: 15,
          },
        },
      });
    }
  });

  it("debe retornar enabled=false si recordatorios deshabilitados", async () => {
    // Deshabilitar temporalmente
    const org = await prisma.organization.findFirst();
    await prisma.organization.update({
      where: { id: org!.id },
      data: { settings: { ...(org!.settings as any), reminderEnabled: false } },
    });

    const req = makeRequest("http://localhost:3001/api/caja/reminders");
    const res = await getReminders();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enabled).toBe(false);
  });

  it("debe retornar info cuando recordatorios están habilitados", async () => {
    const org = await prisma.organization.findFirst();
    await prisma.organization.update({
      where: { id: org!.id },
      data: {
        settings: { ...(org!.settings as any), reminderEnabled: true, reminderBeforeMinutes: 10 },
      },
    });

    const req = makeRequest("http://localhost:3001/api/caja/reminders");
    const res = await getReminders();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enabled).toBe(true);
    expect(data.settings.reminderBeforeMinutes).toBe(10);
    expect(typeof data.pendingCount).toBe("number");
  });
});

describeDb("POST /api/caja/reminders - Envío de recordatorios", () => {
  beforeAll(async () => {
    await setupOrdersWithExpiration();

    // Habilitar recordatorios
    const org = await prisma.organization.findFirst();
    await prisma.organization.update({
      where: { id: org!.id },
      data: { settings: { ...(org!.settings as any), reminderEnabled: true } },
    });
  });

  it("debe ejecutar dryRun sin enviar mensajes", async () => {
    const req = makeRequest("http://localhost:3001/api/caja/reminders", {
      method: "POST",
      body: { reminderType: "PENDING_ONLY", dryRun: true },
    });
    const res = await sendReminders(req, {} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sentCount).toBe(0);
    expect(body.totalPending).toBeGreaterThanOrEqual(0);
  });

  it("debe procesar recordatorios PENDING_ONLY", async () => {
    const req = makeRequest("http://localhost:3001/api/caja/reminders", {
      method: "POST",
      body: { reminderType: "PENDING_ONLY", dryRun: true },
    });
    const res = await sendReminders(req, {} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("debe procesar recordatorios ALL_PRIOR", async () => {
    const req = makeRequest("http://localhost:3001/api/caja/reminders", {
      method: "POST",
      body: { reminderType: "ALL_PRIOR", dryRun: true },
    });
    const res = await sendReminders(req, {} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("debe aceptar customMessage", async () => {
    const customMsg = "Recordatorio especial de prueba";
    const req = makeRequest("http://localhost:3001/api/caja/reminders", {
      method: "POST",
      body: { reminderType: "PENDING_ONLY", customMessage: customMsg, dryRun: true },
    });
    const res = await sendReminders(req, {} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
