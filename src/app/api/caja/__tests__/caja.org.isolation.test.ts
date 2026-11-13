/**
 * Tests de aislamiento por organización en /api/caja y /api/caja/sweep-recovery.
 * Solo corren con TEST_DB=1 (CI con Postgres).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Mock de getOperatorContext para controlar la org de la sesión en cada test
vi.mock("@/lib/session", () => ({
  getOperatorContext: vi.fn(),
}));

import { getOperatorContext } from "@/lib/session";

import { GET as getCaja } from "@/app/api/caja/route";
import { POST as sweepRecovery } from "@/app/api/caja/sweep-recovery/route";

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): NextRequest {
  return new NextRequest(url, {
    method: options.method || "GET",
    headers: { "content-type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

const describeDb = process.env.TEST_DB === "1" ? describe : describe.skip;

// Teléfonos de los leads usados por estos tests (se limpian antes/después).
const TEST_PHONES = ["+525520000001", "+525520000002"];

function setSession(orgId: string, operatorId = "operador-test") {
  (getOperatorContext as ReturnType<typeof vi.fn>).mockResolvedValue({
    operatorId,
    orgId,
    role: "ADMIN",
  });
}

async function cleanup() {
  const leads = await prisma.lead.findMany({
    where: { phone: { in: TEST_PHONES } },
    select: { id: true },
  });
  const leadIds = leads.map((lead) => lead.id);

  if (leadIds.length > 0) {
    await prisma.paymentOrder.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.conversation.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
  }

  await prisma.organization.deleteMany({
    where: { slug: { in: ["caja-org-a-test", "caja-org-b-test"] } },
  });
}

beforeAll(async () => {
  if (process.env.TEST_DB === "1") await cleanup();
});

afterAll(async () => {
  if (process.env.TEST_DB === "1") await cleanup();
  await prisma.$disconnect();
});

describeDb("Aislamiento multi-tenant en caja", () => {
  let orgAId = "";
  let orgBId = "";
  let orderAId = "";
  let orderBId = "";

  beforeAll(async () => {
    const orgA = await prisma.organization.create({
      data: { name: "Org A Caja Test", slug: "caja-org-a-test" },
    });
    const orgB = await prisma.organization.create({
      data: { name: "Org B Caja Test", slug: "caja-org-b-test" },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    // Org A: pedido pagado (sin pendientes).
    const leadA = await prisma.lead.create({
      data: { phone: TEST_PHONES[0], name: "Lead Org A", source: "manual", orgId: orgAId },
    });
    const convA = await prisma.conversation.create({
      data: { leadId: leadA.id, orgId: orgAId },
    });
    const orderA = await prisma.paymentOrder.create({
      data: {
        orgId: orgAId,
        leadId: leadA.id,
        conversationId: convA.id,
        status: "PAID",
        provider: "TRANSFER",
        concept: "Pedido Org A",
        amount: 1000,
      },
    });
    orderAId = orderA.id;

    // Org B: pedido pendiente.
    const leadB = await prisma.lead.create({
      data: { phone: TEST_PHONES[1], name: "Lead Org B", source: "manual", orgId: orgBId },
    });
    const convB = await prisma.conversation.create({
      data: { leadId: leadB.id, orgId: orgBId },
    });
    const orderB = await prisma.paymentOrder.create({
      data: {
        orgId: orgBId,
        leadId: leadB.id,
        conversationId: convB.id,
        status: "PENDING",
        provider: "TRANSFER",
        concept: "Pedido Org B",
        amount: 2000,
      },
    });
    orderBId = orderB.id;
  });

  it("GET /api/caja con sesión de org A solo retorna pedidos de org A", async () => {
    setSession(orgAId);

    const res = await getCaja(makeRequest("http://localhost:3001/api/caja"), {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    const ids = data.map((o: any) => o.id);
    expect(ids).toContain(orderAId);
    expect(ids).not.toContain(orderBId);
    expect(data.every((o: any) => o.orgId === orgAId)).toBe(true);
  });

  it("GET /api/caja con sesión de org B no expone pedidos de org A", async () => {
    setSession(orgBId);

    const res = await getCaja(makeRequest("http://localhost:3001/api/caja"), {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    const ids = data.map((o: any) => o.id);
    expect(ids).toContain(orderBId);
    expect(ids).not.toContain(orderAId);
    expect(data.every((o: any) => o.orgId === orgBId)).toBe(true);
  });

  it("sweep-recovery con sesión de org A no toca el pendiente de org B", async () => {
    setSession(orgAId);

    const res = await sweepRecovery(
      makeRequest("http://localhost:3001/api/caja/sweep-recovery", {
        method: "POST",
        body: { discountPercent: 0 },
      }),
      {} as any
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.totalPending).toBe(0);

    // El pedido de org B sigue pendiente.
    const orderB = await prisma.paymentOrder.findUnique({ where: { id: orderBId } });
    expect(orderB?.status).toBe("PENDING");
  });

  it("sweep-recovery sin sesión devuelve 401", async () => {
    (getOperatorContext as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const res = await sweepRecovery(
      makeRequest("http://localhost:3001/api/caja/sweep-recovery", {
        method: "POST",
        body: { discountPercent: 0 },
      }),
      {} as any
    );

    expect(res.status).toBe(401);
  });
});
