/**
 * Helpers compartidos para tests de integración de API
 * Provee mock de session y utils para testing con BD
 */

import { vi } from "vitest";

// Mock global de getOperatorContext
export function mockSession(
  operatorId: string = "test-operator-123",
  orgId: string = "test-org-1",
  role: string = "ADMIN"
) {
  return vi.fn().mockResolvedValue({
    operatorId,
    orgId,
    role,
  });
}

export function setupSessionMock(
  operatorId: string = "test-operator-123",
  orgId: string = "test-org-1",
  role: string = "ADMIN"
) {
  vi.mock("@/lib/session", () => ({
    getOperatorContext: vi.fn().mockResolvedValue({
      operatorId,
      orgId,
      role,
    }),
  }));
}

// Importar para uso en tests
import { getOperatorContext } from "@/lib/session";
export { getOperatorContext };
