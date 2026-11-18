import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";

function requestFrom(ip: string): NextRequest {
  return {
    headers: { get: (name: string) => (name.toLowerCase() === "x-forwarded-for" ? ip : null) },
  } as unknown as NextRequest;
}

describe("createRateLimiter", () => {
  it("permite peticiones dentro del límite y bloquea el exceso por IP", () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });
    const ip = "203.0.113.10";

    expect(limiter(requestFrom(ip))).toBeNull();
    expect(limiter(requestFrom(ip))).toBeNull();

    const blocked = limiter(requestFrom(ip));
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBeTruthy();
  });

  it("mantiene contadores independientes por IP", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });

    expect(limiter(requestFrom("203.0.113.20"))).toBeNull();
    expect(limiter(requestFrom("203.0.113.21"))).toBeNull();
  });
});
