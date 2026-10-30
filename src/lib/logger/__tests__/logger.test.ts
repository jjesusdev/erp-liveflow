import { describe, it, expect } from "vitest";
import { logger, generateRequestId, createRequestLogger, LogLevel } from "@/lib/logger";

describe("logger", () => {
  it("genera un requestId único", () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe("string");
  });

  it("logger imprime con nivel y contexto (no tira)", () => {
    expect(() => {
      logger(LogLevel.INFO, "mensaje de prueba", { requestId: "abc", operatorId: "op1" });
      logger(LogLevel.WARN, "advertencia", { code: 400 });
      logger(LogLevel.ERROR, "error grave", { error: "fallo" });
    }).not.toThrow();
  });

  it("createRequestLogger retorna funciones info/warn/error", () => {
    const log = createRequestLogger({ requestId: "req-1", operatorId: "op-1" });
    expect(typeof log.info).toBe("function");
    expect(typeof log.warn).toBe("function");
    expect(typeof log.error).toBe("function");

    expect(() => {
      log.info("info con contexto");
      log.warn("aviso");
      log.error("fallo", { extra: true });
    }).not.toThrow();
  });
});
