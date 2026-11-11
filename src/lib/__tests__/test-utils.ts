/**
 * Helpers para testing de API routes que requieren session/cookies.
 * Exporta mockSession, createTestRequest, withTestSession, mockNoSession y MockCookieStore.
 */

import { NextRequest } from "next/server";
import { createHmac } from "crypto";
import { vi } from "vitest";

// Mock de cookies store
class MockCookieStore {
  private store: Map<string, { value: string }> = new Map();

  get(name: string) {
    const item = this.store.get(name);
    return item ? { value: item.value } : undefined;
  }

  set(name: string, value: string, options?: Record<string, unknown>) {
    this.store.set(name, { value });
  }

  delete(name: string) {
    this.store.delete(name);
  }

  clear() {
    this.store.clear();
  }
}

/**
 * Crea un mock de cookies con una session válida
 */
export function mockSession(
  operatorId: string = "test-operator-123",
  orgId: string = "test-org-1",
  role: string = "ADMIN"
) {
  const mockCookies = new MockCookieStore();

  // Crear session token
  const { SESSION_SECRET } = process.env;

  const SESSION_COOKIE = "lf_session";
  const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  const payload = Buffer.from(
    JSON.stringify({ operatorId, orgId, role, issuedAt: Date.now() })
  ).toString("base64url");

  const signature = createHmac("sha256", SESSION_SECRET || "test-secret")
    .update(payload)
    .digest("base64url");
  const token = `${payload}.${signature}`;

  mockCookies.set(SESSION_COOKIE, token, { httpOnly: true });

  return mockCookies;
}

/**
 * Crea una request de test con session mockeada
 */
export function createTestRequest<T = unknown>(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    session?: { operatorId: string; orgId: string; role: string };
  } = {}
): NextRequest {
  const { session, ...restOptions } = options;

  // Mock de cookies() de next/headers
  const mockCookies = session
    ? mockSession(session.operatorId, session.orgId, session.role)
    : new MockCookieStore();

  // Necesitamos hacer el mock antes de que se llame a cookies()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cookies } = require("next/headers");
  cookies.mockResolvedValue(mockCookies as any);

  return new NextRequest(url, {
    method: restOptions.method || "GET",
    headers: { "content-type": "application/json" },
    body: restOptions.body ? JSON.stringify(restOptions.body) : undefined,
  });
}

/**
 * Helper para setup de mocks de session en tests
 * Call this in your test file or use as a wrapper
 */
export function withTestSession(
  operatorId: string = "test-operator-123",
  orgId: string = "test-org-1",
  role: string = "ADMIN"
) {
  const mockCookies = mockSession(operatorId, orgId, role);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cookies } = require("next/headers");
  cookies.mockResolvedValue(mockCookies);
}

/**
 * Mock vacio de cookies (sin session)
 */
export function mockNoSession() {
  const mockCookies = new MockCookieStore();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cookies } = require("next/headers");
  cookies.mockResolvedValue(mockCookies);
}

// Exportar para uso en tests
export { MockCookieStore };
