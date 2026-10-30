import { describe, it, expect } from "vitest";
import { GET as health } from "@/app/api/health/route";

const describeDb = process.env.TEST_DB === "1" ? describe : describe.skip;

describeDb("GET /api/health - Endpoint de salud (con BD)", () => {
  it("retorna 200 con estado de dependencias", async () => {
    const res = await health();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBeDefined();
    expect(["ok", "degraded", "unhealthy"]).toContain(body.status);
    expect(body.dependencies).toBeDefined();
    expect(body.dependencies.db).toBeDefined();
    expect(body.dependencies.whatsapp).toBeDefined();
    expect(body.dependencies.workers).toBeDefined();
  });

  it("db dependency tiene status up o down", async () => {
    const res = await health();
    const body = await res.json();
    expect(["up", "down"]).toContain(body.dependencies.db.status);
  });
});
