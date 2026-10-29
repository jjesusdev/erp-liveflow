/**
 * Tests de integración para /api/leads
 * - Tests de validación pura: funcionan SIN base de datos
 * - Tests que requieren BD: solo corren con TEST_DB=1 (CI con Postgres)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Importar handlers reales de las routes
import { GET as getLeads, POST as postLead } from "@/app/api/leads/route";
import {
  GET as getLeadById,
  PUT as putLead,
  DELETE as deleteLead,
} from "@/app/api/leads/[id]/route";

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

// Los tests que tocan la BD solo corren cuando TEST_DB=1 (CI con Postgres).
// Localmente sin base de datos se saltan para que `npm test` sea confiable.
const describeDb = process.env.TEST_DB === "1" ? describe : describe.skip;

// Teléfonos usados por los tests. Se limpian antes/después para que la suite
// sea idempotente aunque una corrida anterior haya fallado a mitad de camino.
const TEST_PHONES = ["+525512345678", "+525511111111", "+525522222222", "+525587654321"];

async function cleanupTestLeads() {
  const leads = await prisma.lead.findMany({
    where: { phone: { in: TEST_PHONES } },
    select: { id: true },
  });
  const ids = leads.map((lead) => lead.id);
  if (ids.length === 0) return;

  await prisma.shipmentEvent.deleteMany({ where: { shipment: { leadId: { in: ids } } } });
  await prisma.shipment.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.paymentOrder.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.message.deleteMany({ where: { conversation: { leadId: { in: ids } } } });
  await prisma.conversation.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.campaignRecipient.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.lead.deleteMany({ where: { id: { in: ids } } });
}

beforeAll(async () => {
  if (process.env.TEST_DB === "1") await cleanupTestLeads();
});

afterAll(async () => {
  if (process.env.TEST_DB === "1") await cleanupTestLeads();
  await prisma.$disconnect();
});

// Datos de prueba
const testLeadData = {
  phone: "+525512345678",
  name: "Cliente Test",
  source: "TikTok Live",
  internalNotes: "Notas de prueba",
  addressStreet: "Av. Principal",
  addressNumber: "123",
  addressColonia: "Centro",
  addressCity: "Ciudad de Mexico",
  addressState: "CDMX",
  addressZipCode: "01000",
  addressNotes: "Entre calles A y B",
};

describe("POST /api/leads - Crear lead (validación)", () => {
  it("debe validar campos con schema Zod (phone requerido)", async () => {
    const req = makeRequest("http://localhost:3001/api/leads", {
      method: "POST",
      body: { name: "Test" }, // phone faltante
    });

    const res = await postLead(req, {} as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("Validacion fallida");
    expect(body.details).toBeDefined();
  });

  it("debe validar formato de teléfono en schema Zod (min 8 chars)", async () => {
    const req = makeRequest("http://localhost:3001/api/leads", {
      method: "POST",
      body: { ...testLeadData, phone: "123" }, // teléfono muy corto
    });

    const res = await postLead(req, {} as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("Validacion fallida");
    expect(body.details).toBeDefined();
  });
});

describeDb("GET /api/leads - Listado paginado (con BD)", () => {
  it("debe retornar estructura correcta", async () => {
    const req = makeRequest("http://localhost:3001/api/leads?page=1&pageSize=10");
    const res = await getLeads(req, {} as any);

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.items).toBeInstanceOf(Array);
    expect(data.total).toBeTypeOf("number");
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(10);
    expect(data.facets).toBeDefined();
    expect(data.totals).toBeDefined();
  });

  it("debe aceptar parámetros de búsqueda", async () => {
    const req = makeRequest("http://localhost:3001/api/leads?search=Test&page=1&pageSize=10");
    const res = await getLeads(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toBeInstanceOf(Array);
  });

  it("debe aceptar filtro por tier", async () => {
    const req = makeRequest("http://localhost:3001/api/leads?tier=NEW&page=1&pageSize=10");
    const res = await getLeads(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toBeInstanceOf(Array);
  });

  it("debe aceptar parámetros de ordenamiento", async () => {
    const reqAsc = makeRequest(
      "http://localhost:3001/api/leads?sort=name&dir=asc&page=1&pageSize=10"
    );
    const resAsc = await getLeads(reqAsc, {} as any);

    const reqDesc = makeRequest(
      "http://localhost:3001/api/leads?sort=name&dir=desc&page=1&pageSize=10"
    );
    const resDesc = await getLeads(reqDesc, {} as any);

    expect(resAsc.status).toBe(200);
    expect(resDesc.status).toBe(200);
  });

  it("debe exportar todos (export=1)", async () => {
    const req = makeRequest("http://localhost:3001/api/leads?export=1&search=Test");
    const res = await getLeads(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toBeInstanceOf(Array);
    // En modo export no se devuelve paginación
    expect(data.page).toBeUndefined();
    expect(data.total).toBeUndefined();
  });
});

// Tests de validación de parámetros (requieren BD para normalizar y responder)
describeDb("GET /api/leads - Validación de parámetros (con BD)", () => {
  it("debe manejar page inválido", async () => {
    const req = makeRequest("http://localhost:3001/api/leads?page=0&pageSize=10");
    const res = await getLeads(req, {} as any);
    // Debe normalizar page a 1
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.page).toBe(1);
  });

  it("debe manejar pageSize inválido", async () => {
    const req = makeRequest("http://localhost:3001/api/leads?page=1&pageSize=999");
    const res = await getLeads(req, {} as any);
    // Debe normalizar pageSize a 25 (default)
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pageSize).toBe(25);
  });
});

describeDb("GET /api/leads/[id] - Detalle de lead (errores)", () => {
  it("debe retornar 404 para lead inexistente", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const req = makeRequest(`http://localhost:3001/api/leads/${fakeId}`);
    const res = await getLeadById(req, makeContext({ id: fakeId }));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Cliente no encontrado");
  });
});

describe("PUT /api/leads/[id] - Actualizar lead (validación)", () => {
  it("debe validar campos con schema Zod (phone requerido)", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const req = makeRequest(`http://localhost:3001/api/leads/${fakeId}`, {
      method: "PUT",
      body: { phone: "" }, // phone vacío
    });
    const res = await putLead(req, makeContext({ id: fakeId }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validacion fallida");
  });
});

describeDb("PUT /api/leads/[id] - Actualizar lead (errores)", () => {
  it("debe retornar 404 para lead inexistente", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const req = makeRequest(`http://localhost:3001/api/leads/${fakeId}`, {
      method: "PUT",
      body: { name: "Test" },
    });
    const res = await putLead(req, makeContext({ id: fakeId }));

    expect(res.status).toBe(404);
  });
});

describeDb("DELETE /api/leads/[id] - Eliminar lead (errores)", () => {
  it("debe retornar 404 para lead inexistente", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const req = makeRequest(`http://localhost:3001/api/leads/${fakeId}`, { method: "DELETE" });
    const res = await deleteLead(req, makeContext({ id: fakeId }));

    expect(res.status).toBe(404);
  });
});

// Tests que REQUIEREN base de datos - solo corren con TEST_DB=1
describeDb("POST /api/leads - Crear lead (con BD)", () => {
  it("debe crear un lead válido", async () => {
    const req = makeRequest("http://localhost:3001/api/leads", {
      method: "POST",
      body: testLeadData,
    });

    const res = await postLead(req, {} as any);
    expect(res.status).toBe(201);

    const lead = await res.json();
    expect(lead.id).toBeDefined();
    expect(lead.phone).toBe("+525512345678");
    expect(lead.name).toBe("Cliente Test");

    // Limpiar
    await prisma.lead.delete({ where: { id: lead.id } });
  });

  it("debe rechazar teléfono duplicado", async () => {
    const req1 = makeRequest("http://localhost:3001/api/leads", {
      method: "POST",
      body: testLeadData,
    });
    await postLead(req1, {} as any);

    const req2 = makeRequest("http://localhost:3001/api/leads", {
      method: "POST",
      body: testLeadData,
    });
    const res = await postLead(req2, {} as any);
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.error).toBe("Ya existe un cliente con ese telefono");

    // Limpiar
    const existing = await prisma.lead.findUnique({
      where: { phone: "+525512345678" },
    });
    if (existing) await prisma.lead.delete({ where: { id: existing.id } });
  });
});

describeDb("DELETE /api/leads/[id] - Eliminar lead (con BD)", () => {
  let leadToDeleteId: string;

  beforeEach(async () => {
    const leadData = {
      phone: "+525511111111",
      name: "Para Eliminar",
      source: "test",
    };
    const reqCreate = makeRequest("http://localhost:3001/api/leads", {
      method: "POST",
      body: leadData,
    });
    const resCreate = await postLead(reqCreate, {} as any);
    expect(resCreate.status).toBe(201);
    const lead = await resCreate.json();
    leadToDeleteId = lead.id;
    expect(leadToDeleteId).toBeDefined();
  });

  it("debe eliminar lead sin historial", async () => {
    const req = makeRequest(`http://localhost:3001/api/leads/${leadToDeleteId}`, {
      method: "DELETE",
    });
    const res = await deleteLead(req, makeContext({ id: leadToDeleteId }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);

    const exists = await prisma.lead.findUnique({ where: { id: leadToDeleteId } });
    expect(exists).toBeNull();
  });

  it("debe rechazar eliminación de lead con paymentOrders", async () => {
    const leadData = {
      phone: "+525522222222",
      name: "Con Historial",
      source: "test",
    };
    const reqCreate = makeRequest("http://localhost:3001/api/leads", {
      method: "POST",
      body: leadData,
    });
    const resCreate = await postLead(reqCreate, {} as any);
    const lead = await resCreate.json();

    const conversation = await prisma.conversation.create({
      data: { leadId: lead.id, status: "NEW" },
    });

    await prisma.paymentOrder.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        amount: 100,
        currency: "MXN",
        concept: "Test",
        status: "PENDING",
      },
    });

    const req = makeRequest(`http://localhost:3001/api/leads/${lead.id}`, { method: "DELETE" });
    const res = await deleteLead(req, makeContext({ id: lead.id }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("No se puede eliminar");

    await prisma.paymentOrder.deleteMany({ where: { leadId: lead.id } });
    await prisma.conversation.deleteMany({ where: { leadId: lead.id } });
    await prisma.lead.delete({ where: { id: lead.id } });
  });
});

describeDb("GET /api/leads/[id] - Detalle de lead (con BD)", () => {
  let createdLeadId: string;

  beforeAll(async () => {
    const req = makeRequest("http://localhost:3001/api/leads", {
      method: "POST",
      body: testLeadData,
    });
    const res = await postLead(req, {} as any);
    const lead = await res.json();
    createdLeadId = lead.id;
  });

  afterAll(async () => {
    if (createdLeadId) {
      await prisma.lead.delete({ where: { id: createdLeadId } }).catch(() => {});
    }
  });

  it("debe retornar lead con relaciones y campos computados", async () => {
    const req = makeRequest(`http://localhost:3001/api/leads/${createdLeadId}`);
    const res = await getLeadById(req, makeContext({ id: createdLeadId }));

    expect(res.status).toBe(200);
    const lead = await res.json();

    expect(lead.id).toBe(createdLeadId);
    expect(lead.phone).toBe("+525512345678");
    expect(lead.name).toBe("Cliente Test");
    expect(lead.tier).toBeDefined();
    expect(lead.totalPaidCount).toBeTypeOf("number");
    expect(lead.totalSpent).toBeTypeOf("number");
    expect(lead.conversations).toBeInstanceOf(Array);
    expect(lead.paymentOrders).toBeInstanceOf(Array);
    expect(lead.shipments).toBeInstanceOf(Array);
  });
});

describeDb("PUT /api/leads/[id] - Actualizar lead (con BD)", () => {
  let createdLeadId: string;

  beforeAll(async () => {
    const req = makeRequest("http://localhost:3001/api/leads", {
      method: "POST",
      body: testLeadData,
    });
    const res = await postLead(req, {} as any);
    const lead = await res.json();
    createdLeadId = lead.id;
  });

  afterAll(async () => {
    if (createdLeadId) {
      await prisma.lead.delete({ where: { id: createdLeadId } }).catch(() => {});
    }
  });

  it("debe actualizar campos del lead", async () => {
    const req = makeRequest(`http://localhost:3001/api/leads/${createdLeadId}`, {
      method: "PUT",
      body: {
        name: "Cliente Actualizado",
        addressCity: "Guadalajara",
        internalNotes: "Notas actualizadas",
      },
    });
    const res = await putLead(req, makeContext({ id: createdLeadId }));

    expect(res.status).toBe(200);
    const lead = await res.json();
    expect(lead.name).toBe("Cliente Actualizado");
    expect(lead.addressCity).toBe("Guadalajara");
    expect(lead.internalNotes).toBe("Notas actualizadas");
  });

  it("debe validar teléfono único al actualizar", async () => {
    // Crear otro lead
    const newLeadData = { ...testLeadData, phone: "+525587654321", name: "Otro Cliente" };
    const reqCreate = makeRequest("http://localhost:3001/api/leads", {
      method: "POST",
      body: newLeadData,
    });
    const resCreate = await postLead(reqCreate, {} as any);
    expect(resCreate.status).toBe(201);
    const otherLead = await resCreate.json();

    // Intentar actualizar el lead original con el teléfono del otro
    const req = makeRequest(`http://localhost:3001/api/leads/${createdLeadId}`, {
      method: "PUT",
      body: { phone: otherLead.phone },
    });
    const res = await putLead(req, makeContext({ id: createdLeadId }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Ya existe un cliente con ese telefono");

    // Limpiar
    await prisma.lead.delete({ where: { id: otherLead.id } });
  });
});
