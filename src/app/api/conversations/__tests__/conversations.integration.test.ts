/**
 * Tests de integración para /api/conversations
 * Solo corren con TEST_DB=1 (CI con Postgres).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

import { GET as getConversations, POST as postConversation } from "@/app/api/conversations/route";
import {
  GET as getConversationById,
  PATCH as patchConversation,
} from "@/app/api/conversations/[id]/route";

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

async function cleanupByPhone() {
  const leads = await prisma.lead.findMany({
    where: { phone: TEST_PHONE },
    select: { id: true },
  });
  const ids = leads.map((lead) => lead.id);
  if (ids.length === 0) return;

  await prisma.message.deleteMany({ where: { conversation: { leadId: { in: ids } } } });
  await prisma.conversation.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.lead.deleteMany({ where: { id: { in: ids } } });
}

async function setupLead() {
  const lead = await prisma.lead.upsert({
    where: { phone: TEST_PHONE },
    update: { name: "Cliente Test Conversaciones" },
    create: { phone: TEST_PHONE, name: "Cliente Test Conversaciones" },
  });
  leadId = lead.id;
}

beforeAll(async () => {
  if (process.env.TEST_DB === "1") await cleanupByPhone();
});

afterAll(async () => {
  if (process.env.TEST_DB === "1") await cleanupByPhone();
  await prisma.$disconnect();
});

describeDb("POST /api/conversations - Crear conversación (con BD)", () => {
  beforeAll(async () => {
    await setupLead();
  });

  it("debe crear una conversación para un lead existente", async () => {
    const req = makeRequest("http://localhost:3001/api/conversations", {
      method: "POST",
      body: { leadId },
    });
    const res = await postConversation(req, {} as any);

    expect(res.status).toBe(201);
    const conversation = await res.json();
    conversationId = conversation.id;

    expect(conversation.leadId).toBe(leadId);
    expect(conversation.status).toBe("NEW");
  });

  it("debe retornar la conversación existente si ya hay una abierta (idempotencia)", async () => {
    const req = makeRequest("http://localhost:3001/api/conversations", {
      method: "POST",
      body: { leadId },
    });
    const res = await postConversation(req, {} as any);

    expect(res.status).toBe(200);
    const conversation = await res.json();
    expect(conversation.id).toBe(conversationId);
    expect(conversation.status).toBe("NEW");
  });

  it("debe retornar 404 si el lead no existe", async () => {
    const fakeLeadId = "00000000-0000-0000-0000-000000000000";
    const req = makeRequest("http://localhost:3001/api/conversations", {
      method: "POST",
      body: { leadId: fakeLeadId },
    });
    const res = await postConversation(req, {} as any);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Cliente no encontrado");
  });
});

describeDb("GET /api/conversations - Listado (con BD)", () => {
  beforeAll(async () => {
    if (!conversationId) {
      await setupLead();
      const res = await postConversation(
        makeRequest("http://localhost:3001/api/conversations", {
          method: "POST",
          body: { leadId },
        }),
        {} as any
      );
      const conversation = await res.json();
      conversationId = conversation.id;
    }
  });

  it("debe listar conversaciones abiertas por defecto", async () => {
    const req = makeRequest("http://localhost:3001/api/conversations");
    const res = await getConversations(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toBeInstanceOf(Array);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.some((c: any) => c.id === conversationId)).toBe(true);
  });

  it("debe filtrar por status", async () => {
    const req = makeRequest("http://localhost:3001/api/conversations?status=NEW");
    const res = await getConversations(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.every((c: any) => c.status === "NEW")).toBe(true);
  });

  it("debe incluir lead con tier y totales", async () => {
    const req = makeRequest("http://localhost:3001/api/conversations");
    const res = await getConversations(req, {} as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    const conv = data.find((c: any) => c.id === conversationId);
    expect(conv).toBeDefined();
    expect(conv.lead).toBeDefined();
    expect(conv.lead.tier).toBeDefined();
    expect(conv.lead.totalPaidCount).toBeTypeOf("number");
    expect(conv.lead.totalSpent).toBeTypeOf("number");
  });
});

describeDb("GET /api/conversations/[id] - Detalle (con BD)", () => {
  it("debe retornar detalle con lead, mensajes y paymentOrders", async () => {
    const req = makeRequest(`http://localhost:3001/api/conversations/${conversationId}`);
    const res = await getConversationById(req, makeContext({ id: conversationId }));

    expect(res.status).toBe(200);
    const conversation = await res.json();
    expect(conversation.id).toBe(conversationId);
    expect(conversation.lead).toBeDefined();
    expect(conversation.messages).toBeInstanceOf(Array);
    expect(conversation.paymentOrders).toBeInstanceOf(Array);
  });

  it("debe retornar 404 para conversación inexistente", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const req = makeRequest(`http://localhost:3001/api/conversations/${fakeId}`);
    const res = await getConversationById(req, makeContext({ id: fakeId }));

    expect(res.status).toBe(404);
  });
});

describeDb("PATCH /api/conversations/[id] - Actualizar estado (con BD)", () => {
  it("debe avanzar NEW -> PAID -> SHIPPED -> CLOSED", async () => {
    const statuses = ["PAID", "SHIPPED", "CLOSED"];
    for (const status of statuses) {
      const res = await patchConversation(
        makeRequest(`http://localhost:3001/api/conversations/${conversationId}`, {
          method: "PATCH",
          body: { status },
        }),
        makeContext({ id: conversationId })
      );
      expect(res.status).toBe(200);
      const conversation = await res.json();
      expect(conversation.status).toBe(status);
    }
  });

  it("debe establecer closedAt al cambiar a CLOSED", async () => {
    const res = await patchConversation(
      makeRequest(`http://localhost:3001/api/conversations/${conversationId}`, {
        method: "PATCH",
        body: { status: "CLOSED" },
      }),
      makeContext({ id: conversationId })
    );

    expect(res.status).toBe(200);
    const conversation = await res.json();
    expect(conversation.status).toBe("CLOSED");
    expect(conversation.closedAt).toBeDefined();
  });

  it("debe rechazar estado inválido", async () => {
    const res = await patchConversation(
      makeRequest(`http://localhost:3001/api/conversations/${conversationId}`, {
        method: "PATCH",
        body: { status: "ESTADO_INVALIDO" },
      }),
      makeContext({ id: conversationId })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validacion fallida");
  });

  it("debe retornar 404 para conversación inexistente", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await patchConversation(
      makeRequest(`http://localhost:3001/api/conversations/${fakeId}`, {
        method: "PATCH",
        body: { status: "CLOSED" },
      }),
      makeContext({ id: fakeId })
    );

    expect(res.status).toBe(404);
  });
});
