import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";
import { verifyWebhookSignature } from "@/lib/payments/mercadopago";

const SECRET = "webhook-secret-de-prueba-123456";

describe("verifyWebhookSignature", () => {
  const originalSecret = process.env.MP_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.MP_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.MP_WEBHOOK_SECRET;
    else process.env.MP_WEBHOOK_SECRET = originalSecret;
  });

  it("acepta el formato real de x-signature de MercadoPago", () => {
    const ts = "1704908010";
    const requestId = "req-abc-123";
    const paymentId = "987654321";
    const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac("sha256", SECRET).update(manifest).digest("hex");

    expect(
      verifyWebhookSignature({
        signature: `ts=${ts},v1=${v1}`,
        requestId,
        paymentId,
        ts,
      })
    ).toBe(true);
  });

  it("rechaza una firma manipulada", () => {
    expect(
      verifyWebhookSignature({
        signature: "ts=1704908010,v1=" + "0".repeat(64),
        requestId: "req-abc-123",
        paymentId: "987654321",
        ts: "1704908010",
      })
    ).toBe(false);
  });

  it("rechaza la petición si falta el timestamp", () => {
    expect(
      verifyWebhookSignature({
        signature: "v1=" + "0".repeat(64),
        requestId: "req-abc-123",
        paymentId: "987654321",
        ts: null,
      })
    ).toBe(false);
  });
});
