import { describe, it, expect } from 'vitest';
import {
  businessConfigSchema,
  leadCreateSchema,
  productSchema,
  shipmentCreateSchema,
  campaignCreateSchema,
} from '@/lib/schemas';

describe('businessConfigSchema', () => {
  it('accepts valid config', () => {
    const result = businessConfigSchema.safeParse({
      businessName: 'LiveFlow',
      currency: 'MXN',
      bankName: 'BBVA',
      bankClabe: '012345678901234567',
    });
    expect(result.success).toBe(true);
  });

  it('rejects CLABE with wrong length', () => {
    const result = businessConfigSchema.safeParse({ bankClabe: '12345' });
    expect(result.success).toBe(false);
  });

  it('accepts empty object (all optional)', () => {
    expect(businessConfigSchema.safeParse({}).success).toBe(true);
  });

  it('rejects invalid currency length', () => {
    const result = businessConfigSchema.safeParse({ currency: 'MX' });
    expect(result.success).toBe(false);
  });

  it('rejects autoReplyDelayMs out of range', () => {
    expect(businessConfigSchema.safeParse({ autoReplyDelayMs: -1 }).success).toBe(false);
    expect(businessConfigSchema.safeParse({ autoReplyDelayMs: 999999 }).success).toBe(false);
  });
});

describe('leadCreateSchema', () => {
  it('accepts valid lead', () => {
    expect(leadCreateSchema.safeParse({ name: 'Maria', phone: '+521234567890' }).success).toBe(true);
  });

  it('rejects missing name', () => {
    expect(leadCreateSchema.safeParse({ phone: '+521234567890' }).success).toBe(false);
  });

  it('rejects short phone', () => {
    expect(leadCreateSchema.safeParse({ name: 'Maria', phone: '123' }).success).toBe(false);
  });
});

describe('productSchema', () => {
  it('accepts valid product', () => {
    const result = productSchema.safeParse({
      name: 'Blusa floral',
      price: 450,
      stock: 10,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative price', () => {
    expect(productSchema.safeParse({ name: 'X', price: -1 }).success).toBe(false);
  });

  it('rejects negative stock', () => {
    expect(productSchema.safeParse({ name: 'X', price: 100, stock: -5 }).success).toBe(false);
  });
});

describe('shipmentCreateSchema', () => {
  it('accepts valid shipment', () => {
    const result = shipmentCreateSchema.safeParse({
      orderIds: ['ord_1', 'ord_2'],
      carrier: 'FedEx',
      dispatchType: 'CARRIER',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty orderIds', () => {
    expect(
      shipmentCreateSchema.safeParse({ orderIds: [], carrier: 'X', dispatchType: 'CARRIER' }).success
    ).toBe(false);
  });

  it('rejects invalid dispatchType', () => {
    expect(
      shipmentCreateSchema.safeParse({
        orderIds: ['a'],
        carrier: 'X',
        dispatchType: 'INVALID',
      }).success
    ).toBe(false);
  });
});

describe('campaignCreateSchema', () => {
  it('accepts valid campaign', () => {
    const result = campaignCreateSchema.safeParse({
      name: 'Promo Verano',
      message: 'Hola! Tienes un 20% de descuento',
      leadIds: ['lead_1'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty message', () => {
    expect(
      campaignCreateSchema.safeParse({ name: 'X', message: '', leadIds: ['a'] }).success
    ).toBe(false);
  });

  it('rejects delayMs too low', () => {
    expect(
      campaignCreateSchema.safeParse({
        name: 'X',
        message: 'Hello',
        leadIds: ['a'],
        delayMs: 100,
      }).success
    ).toBe(false);
  });
});
