import { describe, expect, it } from "vitest";
import {
  buildChargeConcept,
  buildChargePreview,
  calculateChargeTotals,
  providerForMethod,
} from "@/lib/payments/charge";

const bag = [
  { name: "Vestido satinado", price: 450 },
  { name: "Blusa floral", price: 250 },
];

describe("calculateChargeTotals", () => {
  it("usa el monto simple sin envío", () => {
    expect(
      calculateChargeTotals({ mode: "simple", amount: 450, shipping: 99, items: bag })
    ).toEqual({
      subtotal: 450,
      shipping: 0,
      total: 450,
    });
  });

  it("suma la bolsa y el envío", () => {
    expect(calculateChargeTotals({ mode: "bolsa", amount: 0, shipping: 99, items: bag })).toEqual({
      subtotal: 700,
      shipping: 99,
      total: 799,
    });
  });

  it("ignora montos negativos", () => {
    expect(
      calculateChargeTotals({ mode: "simple", amount: -10, shipping: 0, items: [] }).total
    ).toBe(0);
  });
});

describe("buildChargeConcept", () => {
  it("devuelve el concepto simple recortado", () => {
    expect(
      buildChargeConcept({
        mode: "simple",
        concept: "  Vestido  ",
        amount: 1,
        shipping: 0,
        items: [],
      })
    ).toBe("Vestido");
  });

  it("consolida los nombres de la bolsa con el envío", () => {
    expect(
      buildChargeConcept({ mode: "bolsa", concept: "", amount: 0, shipping: 99, items: bag })
    ).toBe("Vestido satinado + Blusa floral (+ Envío $99)");
  });
});

describe("buildChargePreview", () => {
  const base = {
    mode: "simple" as const,
    concept: "Vestido",
    amount: 450,
    shipping: 0,
    items: bag,
    firstName: "Ana",
    reference: "ABC12345",
    currency: "MXN" as const,
  };

  it("usa datos bancarios de configuración y nunca literales fijos", () => {
    const message = buildChargePreview({
      ...base,
      method: "transferencia",
      bank: { bankName: "Banco Configurado", bankClabe: "000 111 222" },
    });
    expect(message).toContain("Banco Configurado");
    expect(message).toContain("000 111 222");
    expect(message).not.toContain("BBVA");
    expect(message).toContain("ABC12345");
  });

  it("genera el link de MercadoPago con la referencia", () => {
    const message = buildChargePreview({ ...base, method: "mercadopago" });
    expect(message).toContain("mpago.la/lf-abc12345");
    expect(message).toContain("450");
  });

  it("mapea métodos a proveedores de la API", () => {
    expect(providerForMethod("transferencia")).toBe("TRANSFER");
    expect(providerForMethod("mercadopago")).toBe("MERCADOPAGO");
  });
});
