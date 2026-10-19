import { describe, it, expect } from "vitest";
import {
  businessConfigSchema,
  leadCreateSchema,
  conversationCreateSchema,
  productCreateSchema as productSchema,
  shipmentCreateSchema,
  campaignCreateSchema,
} from "@/lib/schemas";

describe("businessConfigSchema", () => {
  it("accepts valid config", () => {
    const result = businessConfigSchema.safeParse({
      businessName: "LiveFlow",
      currency: "MXN",
      bankName: "BBVA",
      bankClabe: "012345678901234567",
    });
    expect(result.success).toBe(true);
  });

  it("rejects CLABE with wrong length", () => {
    const result = businessConfigSchema.safeParse({ bankClabe: "12345" });
    expect(result.success).toBe(false);
  });

  it("accepts empty object (all optional)", () => {
    expect(businessConfigSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid currency length", () => {
    const result = businessConfigSchema.safeParse({ currency: "MX" });
    expect(result.success).toBe(false);
  });

  it("rejects autoReplyDelayMs out of range", () => {
    expect(businessConfigSchema.safeParse({ autoReplyDelayMs: -1 }).success).toBe(false);
    expect(businessConfigSchema.safeParse({ autoReplyDelayMs: 999999 }).success).toBe(false);
  });
});

describe("leadCreateSchema", () => {
  it("accepts valid lead", () => {
    expect(leadCreateSchema.safeParse({ name: "Maria", phone: "+521234567890" }).success).toBe(
      true
    );
  });

  it("accepts lead with only phone (name is optional)", () => {
    expect(leadCreateSchema.safeParse({ phone: "+521234567890" }).success).toBe(true);
  });

  it("rejects missing phone", () => {
    expect(leadCreateSchema.safeParse({ name: "Maria" }).success).toBe(false);
  });

  it("rejects short phone", () => {
    expect(leadCreateSchema.safeParse({ name: "Maria", phone: "123" }).success).toBe(false);
  });

  it("accepts optional delivery address and notes", () => {
    const result = leadCreateSchema.safeParse({
      phone: "+521234567890",
      name: "Maria",
      addressCity: "Santiago",
      addressZipCode: "8320000",
      internalNotes: "Prefiere entrega por la tarde",
    });
    expect(result.success).toBe(true);
  });
});

describe("conversationCreateSchema", () => {
  it("accepts a leadId", () => {
    expect(conversationCreateSchema.safeParse({ leadId: "lead_1" }).success).toBe(true);
  });

  it("rejects empty leadId", () => {
    expect(conversationCreateSchema.safeParse({ leadId: "" }).success).toBe(false);
  });
});

describe("productSchema", () => {
  it("accepts valid product", () => {
    const result = productSchema.safeParse({
      name: "Blusa floral",
      price: 450,
      stock: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative price", () => {
    expect(productSchema.safeParse({ name: "X", price: -1 }).success).toBe(false);
  });

  it("rejects negative stock", () => {
    expect(productSchema.safeParse({ name: "X", price: 100, stock: -5 }).success).toBe(false);
  });
});

describe("shipmentCreateSchema", () => {
  it("accepts valid shipment", () => {
    const result = shipmentCreateSchema.safeParse({
      paymentOrderId: "ord_1",
      carrier: "FedEx",
      trackingNumber: "TRACK123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing paymentOrderId", () => {
    expect(shipmentCreateSchema.safeParse({ carrier: "FedEx" }).success).toBe(false);
  });

  it("accepts shipment with only paymentOrderId", () => {
    expect(shipmentCreateSchema.safeParse({ paymentOrderId: "ord_1" }).success).toBe(true);
  });
});

describe("campaignCreateSchema", () => {
  it("accepts valid campaign", () => {
    const result = campaignCreateSchema.safeParse({
      name: "Promo Verano",
      message: "Hola! Tienes un 20% de descuento",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty message", () => {
    expect(campaignCreateSchema.safeParse({ name: "X", message: "" }).success).toBe(false);
  });

  it("rejects missing name", () => {
    expect(campaignCreateSchema.safeParse({ message: "Hello" }).success).toBe(false);
  });

  it("accepts campaign with sendNow", () => {
    const result = campaignCreateSchema.safeParse({
      name: "Flash Sale",
      message: " hurry!",
      sendNow: true,
    });
    expect(result.success).toBe(true);
  });
});
