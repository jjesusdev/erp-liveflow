import { describe, it, expect, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST as createCarrier } from "@/app/api/carriers/route";
import { PATCH as patchCarrier, DELETE as deleteCarrier } from "@/app/api/carriers/[id]/route";
import { POST as testCarrier } from "@/app/api/carriers/[id]/test/route";

const describeDb = process.env.TEST_DB === "1" ? describe : describe.skip;
const TEST_CODE = `TEST-SHIPIT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}) {
  return new NextRequest(url, {
    method: options.method || "GET",
    headers: { "content-type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validConfig = { apiKey: "test-key", apiSecret: "test-secret" };

describeDb("API de carriers - validación de configuración (con BD)", () => {
  let carrierId = "";

  afterAll(async () => {
    if (carrierId) {
      await prisma.carrier.delete({ where: { id: carrierId } }).catch(() => {});
    }
  });

  it("rechaza crear un carrier SHIPIT sin configuración", async () => {
    const res = await createCarrier(
      makeRequest("http://localhost:3001/api/carriers", {
        method: "POST",
        body: {
          code: `${TEST_CODE}-INVALID`,
          name: "Shipit inválido",
          mode: "COURIER",
          apiProvider: "SHIPIT",
        },
      }),
      {} as never
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Configuracion invalida");
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.stringContaining("apiKey"),
        expect.stringContaining("apiSecret"),
      ])
    );
  });

  it("crea un carrier SHIPIT con configuración válida", async () => {
    const res = await createCarrier(
      makeRequest("http://localhost:3001/api/carriers", {
        method: "POST",
        body: {
          code: TEST_CODE,
          name: "Shipit Test",
          mode: "COURIER",
          apiProvider: "SHIPIT",
          config: validConfig,
        },
      }),
      {} as never
    );

    expect(res.status).toBe(201);
    const carrier = await res.json();
    carrierId = carrier.id;
    expect(carrier.apiProvider).toBe("SHIPIT");
  });

  it("valida la configuración guardada desde el endpoint de test", async () => {
    const res = await testCarrier(
      makeRequest("http://localhost:3001/api/carriers/x/test", {
        method: "POST",
      }),
      makeContext(carrierId)
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.provider).toBe("SHIPIT");
  });

  it("rechaza actualizar a una configuración incompleta", async () => {
    const res = await patchCarrier(
      makeRequest("http://localhost:3001/api/carriers/x", {
        method: "PATCH",
        body: { config: { apiKey: "solo-key" } },
      }),
      makeContext(carrierId)
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toEqual([expect.stringContaining("apiSecret")]);
  });

  it("elimina el carrier de prueba", async () => {
    const res = await deleteCarrier(
      makeRequest("http://localhost:3001/api/carriers/x", { method: "DELETE" }),
      makeContext(carrierId)
    );

    expect(res.status).toBe(200);
    const exists = await prisma.carrier.findUnique({ where: { id: carrierId } });
    expect(exists).toBeNull();
    carrierId = "";
  });
});
