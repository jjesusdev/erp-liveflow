/**
 * Tests de aislamiento por organización en /api/leads
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

// Importar handlers reales de las routes
import { GET as getLeads, POST as postLead } from "@/app/api/leads/route";
import { GET as getLeadById } from "@/app/api/leads/[id]/route";

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

// Los tests que tocan la BD solo corren cuando TEST_DB=1 (CI con Postgres).
const describeDb = process.env.TEST_DB === "1" ? describe : describe.skip;

// Teléfonos usados por los tests. Se limpian antes/después para idempotencia.
const TEST_PHONES = ["+525510000001", "+525510000002", "+525510000003"];

async function cleanupTestLeads() {
  const leads = await prisma.lead.findMany({
    where: { phone: { in: TEST_PHONES } },
    select: { id: true },
  });
  const ids = leads.map((lead) => lead.id);
  if (ids.length === 0) return;

  await prisma.lead.deleteMany({ where: { id: { in: ids } } });
}

async function cleanupTestOrgs() {
  await prisma.organization.deleteMany({
    where: { name: { in: ["Org A Test", "Org B Test", "Org Crear Test"] } },
  });
}

beforeAll(async () => {
  if (process.env.TEST_DB === "1") {
    await cleanupTestLeads();
    await cleanupTestOrgs();
  }
});

afterAll(async () => {
  if (process.env.TEST_DB === "1") {
    await cleanupTestLeads();
    await cleanupTestOrgs();
  }
  await prisma.$disconnect();
});

/**
 * Fija la sesión devuelta por getOperatorContext para un orgId dado.
 */
function setSession(orgId: string, operatorId = "operador-test") {
  (getOperatorContext as ReturnType<typeof vi.fn>).mockResolvedValue({
    operatorId,
    orgId,
    role: "admin",
  });
}

describeDb("GET /api/leads - Aislamiento por organización", () => {
  let orgAId: string;
  let orgBId: string;
  let leadAId: string;
  let leadBId: string;

  beforeAll(async () => {
    // Crear dos organizaciones
    const orgA = await prisma.organization.create({
      data: { name: "Org A Test", slug: "org-a-test" },
    });
    const orgB = await prisma.organization.create({
      data: { name: "Org B Test", slug: "org-b-test" },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    // Crear un lead en cada organización
    const leadA = await prisma.lead.create({
      data: {
        phone: "+525510000001",
        name: "Lead de Org A",
        source: "manual",
        orgId: orgAId,
        lastInteractionAt: new Date(),
      },
    });
    const leadB = await prisma.lead.create({
      data: {
        phone: "+525510000002",
        name: "Lead de Org B",
        source: "manual",
        orgId: orgBId,
        lastInteractionAt: new Date(),
      },
    });
    leadAId = leadA.id;
    leadBId = leadB.id;
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { id: { in: [leadAId, leadBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  });

  it("listar leads con sesión de org A solo retorna los de org A", async () => {
    setSession(orgAId);

    const req = makeRequest("http://localhost:3001/api/leads?page=1&pageSize=10");
    const res = await getLeads(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toBeInstanceOf(Array);
    expect(data.items.length).toBe(1);
    expect(data.items[0].id).toBe(leadAId);
    expect(data.items[0].phone).toBe("+525510000001");
  });

  it("listar leads con sesión de org B solo retorna los de org B", async () => {
    setSession(orgBId);

    const req = makeRequest("http://localhost:3001/api/leads?page=1&pageSize=10");
    const res = await getLeads(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toBeInstanceOf(Array);
    expect(data.items.length).toBe(1);
    expect(data.items[0].id).toBe(leadBId);
    expect(data.items[0].phone).toBe("+525510000002");
  });

  it("detalle de lead de org B con sesión de org A → 404", async () => {
    setSession(orgAId);

    const req = makeRequest(`http://localhost:3001/api/leads/${leadBId}`);
    const res = await getLeadById(req, makeContext({ id: leadBId }));

    expect(res.status).toBe(404);
  });
});

describeDb("POST /api/leads - Asignar orgId de sesión al crear", () => {
  let orgId: string;

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: "Org Crear Test", slug: "org-crear-test" },
    });
    orgId = org.id;
  });

  afterAll(async () => {
    await prisma.organization.delete({ where: { id: orgId } });
  });

  it("asigna el orgId de la sesión al crear el lead e ignora el del body", async () => {
    setSession(orgId);

    const req = makeRequest("http://localhost:3001/api/leads", {
      method: "POST",
      body: {
        phone: "+525510000003",
        name: "Lead Creado",
        source: "manual",
        // orgId no debe ser aceptado del body (se ignora si viene)
        orgId: "00000000-0000-0000-0000-000000000000",
      },
    });
    const res = await postLead(req, {} as any);
    expect(res.status).toBe(201);

    const lead = await res.json();
    expect(lead.orgId).toBe(orgId);
    expect(lead.orgId).not.toBe("00000000-0000-0000-0000-000000000000");

    // Limpiar
    await prisma.lead.delete({ where: { id: lead.id } });
  });
});
