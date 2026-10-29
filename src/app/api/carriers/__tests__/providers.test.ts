import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/carriers/providers/route";

function makeRequest() {
  return new NextRequest("http://localhost:3001/api/carriers/providers");
}

describe("GET /api/carriers/providers", () => {
  it("lista los proveedores registrados con su metadata de configuración", async () => {
    const res = await GET(makeRequest(), {} as never);

    expect(res.status).toBe(200);

    const { items } = await res.json();
    expect(items).toBeInstanceOf(Array);

    const codes = items.map((p: { code: string }) => p.code);
    expect(codes).toContain("MANUAL");
    expect(codes).toContain("SHIPIT");
    expect(codes).toContain("CHILEXPRESS");
    expect(codes).toContain("BLUE");
  });

  it("MANUAL no requiere configuración y los proveedores reales sí", async () => {
    const res = await GET(makeRequest(), {} as never);
    const { items } = await res.json();

    const manual = items.find((p: { code: string }) => p.code === "MANUAL");
    expect(manual.requiresConfig).toBe(false);
    expect(manual.requiredConfig).toEqual([]);

    const shipit = items.find((p: { code: string }) => p.code === "SHIPIT");
    expect(shipit.requiresConfig).toBe(true);
    expect(shipit.requiredConfig).toEqual(["apiKey", "apiSecret"]);
  });
});
