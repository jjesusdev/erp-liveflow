import { describe, it, expect, vi, beforeEach } from "vitest";

const { state } = vi.hoisted(() => ({
  state: { token: undefined as string | undefined },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "lf_session" && state.token ? { value: state.token } : undefined,
  }),
}));

import { getSession } from "@/lib/session";

describe("getSession con cookies malformadas", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "session-secret-de-prueba-123456";
    state.token = undefined;
  });

  it("devuelve null (no 500) cuando la firma no es base64 válido", async () => {
    state.token = "cGF5bG9hZA.!!!";
    await expect(getSession()).resolves.toBeNull();
  });

  it("devuelve null cuando el token no tiene dos partes", async () => {
    state.token = "solo-un-pedazo";
    await expect(getSession()).resolves.toBeNull();
  });
});
