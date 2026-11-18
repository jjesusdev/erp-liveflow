import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 120; // per window

/**
 * Simple in-memory rate limiter middleware for API routes.
 * Returns null if the request is allowed, or a 429 NextResponse if rate limited.
 */
const defaultLimiter = createRateLimiter({ windowMs: WINDOW_MS, max: MAX_REQUESTS });

export function rateLimit(req: NextRequest): NextResponse | null {
  return defaultLimiter(req);
}

/** Limiters dedicados por endpoint (login, webhooks, etc.). */
export function createRateLimiter({
  windowMs = WINDOW_MS,
  max = MAX_REQUESTS,
}: {
  windowMs?: number;
  max?: number;
} = {}) {
  const localHits = new Map<string, { count: number; resetAt: number }>();
  return (req: NextRequest): NextResponse | null => {
    // Limpieza lazy: evita un intervalo global y acota el mapa en memoria.
    if (localHits.size > 1000) {
      const now = Date.now();
      for (const [key, entry] of localHits) {
        if (now > entry.resetAt) localHits.delete(key);
      }
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const now = Date.now();
    const entry = localHits.get(ip);

    if (!entry || now > entry.resetAt) {
      localHits.set(ip, { count: 1, resetAt: now + windowMs });
      return null;
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(max),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    return null;
  };
}
