import { Prisma } from "@prisma/client";

export const CUSTOMER_TIERS = ["VIP", "FREQUENT", "NEW", "GHOST"] as const;
export type CustomerTierCode = (typeof CUSTOMER_TIERS)[number];

export const VIP_MIN_PAID_COUNT = 3;
export const VIP_MIN_SPENT = 2000;

export function isCustomerTier(value: string): value is CustomerTierCode {
  return (CUSTOMER_TIERS as readonly string[]).includes(value);
}

/** Regla de tiers en memoria, compartida por los handlers que calculan el nivel del cliente. */
export function customerTier(input: {
  totalPaidCount: number;
  totalSpent: number;
  hasFailedPayment?: boolean;
}): CustomerTierCode {
  if (input.totalPaidCount >= VIP_MIN_PAID_COUNT || input.totalSpent >= VIP_MIN_SPENT) {
    return "VIP";
  }
  if (input.totalPaidCount >= 1) return "FREQUENT";
  if (input.hasFailedPayment) return "GHOST";
  return "NEW";
}

/** La misma regla expresada en SQL para el listado de leads (agregados `paid` / `failed`). */
export const TIER_CASE = Prisma.sql`CASE
  WHEN COALESCE(p.paid_count, 0) >= ${VIP_MIN_PAID_COUNT} OR COALESCE(p.spent, 0) >= ${VIP_MIN_SPENT} THEN 'VIP'
  WHEN COALESCE(p.paid_count, 0) >= 1 THEN 'FREQUENT'
  WHEN f.lid IS NOT NULL THEN 'GHOST'
  ELSE 'NEW'
END`;

export const TIER_RANK = Prisma.sql`CASE
  WHEN COALESCE(p.paid_count, 0) >= ${VIP_MIN_PAID_COUNT} OR COALESCE(p.spent, 0) >= ${VIP_MIN_SPENT} THEN 3
  WHEN COALESCE(p.paid_count, 0) >= 1 THEN 2
  WHEN f.lid IS NOT NULL THEN 0
  ELSE 1
END`;

export const TIER_WHERE: Record<CustomerTierCode, Prisma.Sql> = {
  VIP: Prisma.sql`AND (COALESCE(p.paid_count, 0) >= ${VIP_MIN_PAID_COUNT} OR COALESCE(p.spent, 0) >= ${VIP_MIN_SPENT})`,
  FREQUENT: Prisma.sql`AND (COALESCE(p.paid_count, 0) >= 1 AND NOT (COALESCE(p.paid_count, 0) >= ${VIP_MIN_PAID_COUNT} OR COALESCE(p.spent, 0) >= ${VIP_MIN_SPENT}))`,
  GHOST: Prisma.sql`AND (COALESCE(p.paid_count, 0) = 0 AND f.lid IS NOT NULL)`,
  NEW: Prisma.sql`AND (COALESCE(p.paid_count, 0) = 0 AND f.lid IS NULL)`,
};
