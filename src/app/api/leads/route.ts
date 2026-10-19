import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiHandler } from "@/lib/api-handler";
import { leadCreateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];
const EXPORT_LIMIT = 20000;

const AGG_CTES = Prisma.sql`
  paid AS (
    SELECT "leadId" AS lid,
           COUNT(*)::int AS paid_count,
           COALESCE(SUM(amount), 0)::float8 AS spent,
           MAX(COALESCE("paidAt", "createdAt")) AS last_paid
    FROM "PaymentOrder"
    WHERE status = 'PAID' AND "leadId" IS NOT NULL
    GROUP BY "leadId"
  ),
  failed AS (
    SELECT DISTINCT "leadId" AS lid
    FROM "PaymentOrder"
    WHERE status IN ('EXPIRED', 'CANCELLED') AND "leadId" IS NOT NULL
  )
`;

const TIER_CASE = Prisma.sql`CASE
    WHEN COALESCE(p.paid_count, 0) >= 3 OR COALESCE(p.spent, 0) >= 2000 THEN 'VIP'
    WHEN COALESCE(p.paid_count, 0) >= 1 THEN 'FREQUENT'
    WHEN f.lid IS NOT NULL THEN 'GHOST'
    ELSE 'NEW'
  END`;

const TIER_RANK = Prisma.sql`CASE
    WHEN COALESCE(p.paid_count, 0) >= 3 OR COALESCE(p.spent, 0) >= 2000 THEN 3
    WHEN COALESCE(p.paid_count, 0) >= 1 THEN 2
    WHEN f.lid IS NOT NULL THEN 0
    ELSE 1
  END`;

const TIER_WHERE: Record<string, Prisma.Sql> = {
  VIP: Prisma.sql`AND (COALESCE(p.paid_count, 0) >= 3 OR COALESCE(p.spent, 0) >= 2000)`,
  FREQUENT: Prisma.sql`AND (COALESCE(p.paid_count, 0) >= 1 AND NOT (COALESCE(p.paid_count, 0) >= 3 OR COALESCE(p.spent, 0) >= 2000))`,
  GHOST: Prisma.sql`AND (COALESCE(p.paid_count, 0) = 0 AND f.lid IS NOT NULL)`,
  NEW: Prisma.sql`AND (COALESCE(p.paid_count, 0) = 0 AND f.lid IS NULL)`,
};

const SORT_EXPR: Record<string, Prisma.Sql> = {
  name: Prisma.sql`l.name`,
  city: Prisma.sql`l."addressCity"`,
  orders: Prisma.sql`COALESCE(p.paid_count, 0)`,
  ticket: Prisma.sql`(CASE WHEN COALESCE(p.paid_count, 0) > 0 THEN COALESCE(p.spent, 0) / p.paid_count ELSE 0 END)`,
  total: Prisma.sql`COALESCE(p.spent, 0)`,
  recent: Prisma.sql`COALESCE(p.last_paid, l."lastInteractionAt", l."firstContactAt")`,
  tier: TIER_RANK,
};

const TEXT_SORTS = new Set(["name", "city"]);

interface ListRow {
  id: string;
  name: string | null;
  phone: string;
  source: string | null;
  addressCity: string | null;
  addressState: string | null;
  lastInteractionAt: Date | null;
  firstContactAt: Date;
  totalPaidCount: number;
  totalSpent: number;
  lastPaidAt: Date | null;
  tier: string;
}

function normalizePhone(raw: string) {
  // Conserva el + inicial y elimina espacios/guiones/paréntesis.
  const plus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return (plus ? "+" : "") + digits;
}

export const GET = apiHandler({
  handler: async (req: NextRequest) => {
    const sp = req.nextUrl.searchParams;
    const search = (sp.get("search") || "").trim();
    const rawTier = (sp.get("tier") || "all").trim();
    const tier = rawTier in TIER_WHERE ? rawTier : "all";
    const rawSort = sp.get("sort") || "";
    const sort = rawSort in SORT_EXPR ? rawSort : "recent";
    const dir = sp.get("dir") === "asc" ? "asc" : "desc";
    const exporting = sp.get("export") === "1";

    let pageSize = Number(sp.get("pageSize") || 25);
    if (!ALLOWED_PAGE_SIZES.includes(pageSize)) pageSize = 25;
    let page = Number(sp.get("page") || 1);
    if (!Number.isFinite(page) || page < 1) page = 1;

    const like = `%${search}%`;
    const searchCond = search
      ? Prisma.sql`AND (l.name ILIKE ${like} OR l.phone LIKE ${like})`
      : Prisma.empty;
    const tierCond = tier === "all" ? Prisma.empty : TIER_WHERE[tier];
    const orderExpr = SORT_EXPR[sort];
    const dirSql = Prisma.raw(dir.toUpperCase());
    const nullsSql = TEXT_SORTS.has(sort) ? Prisma.raw(" NULLS LAST") : Prisma.empty;

    const limit = exporting ? EXPORT_LIMIT : pageSize;
    const offset = exporting ? 0 : (page - 1) * pageSize;

    const items = await prisma.$queryRaw<ListRow[]>(Prisma.sql`
      WITH ${AGG_CTES}
      SELECT
        l.id,
        l.name,
        l.phone,
        l.source,
        l."addressCity",
        l."addressState",
        l."lastInteractionAt",
        l."firstContactAt",
        COALESCE(p.paid_count, 0)::int AS "totalPaidCount",
        COALESCE(p.spent, 0)::float8 AS "totalSpent",
        p.last_paid AS "lastPaidAt",
        ${TIER_CASE} AS tier
      FROM "Lead" l
      LEFT JOIN paid p ON p.lid = l.id
      LEFT JOIN failed f ON f.lid = l.id
      WHERE TRUE ${searchCond} ${tierCond}
      ORDER BY ${orderExpr} ${dirSql}${nullsSql}
      LIMIT ${limit} OFFSET ${offset}
    `);

    if (exporting) {
      return NextResponse.json({ items });
    }

    const facetRows = await prisma.$queryRaw<{ tier: string; count: number }[]>(Prisma.sql`
      WITH ${AGG_CTES}
      SELECT ${TIER_CASE} AS tier, COUNT(*)::int AS count
      FROM "Lead" l
      LEFT JOIN paid p ON p.lid = l.id
      LEFT JOIN failed f ON f.lid = l.id
      WHERE TRUE ${searchCond}
      GROUP BY 1
    `);

    const facets: Record<string, number> = { all: 0, VIP: 0, FREQUENT: 0, NEW: 0, GHOST: 0 };
    for (const row of facetRows) {
      facets[row.tier] = row.count;
      facets.all += row.count;
    }

    const totalsRows = await prisma.$queryRaw<
      { count: number; revenue: number; orders: number; active30: number }[]
    >(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::int FROM "Lead") AS count,
        (SELECT COALESCE(SUM(amount), 0)::float8 FROM "PaymentOrder" WHERE status = 'PAID') AS revenue,
        (SELECT COUNT(*)::int FROM "PaymentOrder" WHERE status = 'PAID') AS orders,
        (SELECT COUNT(*)::int FROM "Lead" WHERE "lastInteractionAt" >= NOW() - INTERVAL '30 days') AS active30
    `);

    return NextResponse.json({
      items,
      total: facets.all,
      page,
      pageSize,
      facets,
      totals: totalsRows[0] ?? { count: 0, revenue: 0, orders: 0, active30: 0 },
    });
  },
});

export const POST = apiHandler({
  body: leadCreateSchema,
  handler: async (req: NextRequest, body) => {
    const phone = normalizePhone(String(body.phone || ""));

    if (!phone || phone.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ error: "Telefono invalido (minimo 8 digitos)" }, { status: 400 });
    }

    const existing = await prisma.lead.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un cliente con ese telefono" }, { status: 409 });
    }

    const lead = await prisma.lead.create({
      data: {
        phone,
        name: body.name?.trim() || null,
        source: body.source?.trim() || "manual",
        internalNotes: body.internalNotes?.trim() || null,
        addressStreet: body.addressStreet?.trim() || null,
        addressNumber: body.addressNumber?.trim() || null,
        addressColonia: body.addressColonia?.trim() || null,
        addressCity: body.addressCity?.trim() || null,
        addressState: body.addressState?.trim() || null,
        addressZipCode: body.addressZipCode?.trim() || null,
        addressNotes: body.addressNotes?.trim() || null,
        lastInteractionAt: new Date(),
      },
    });

    return NextResponse.json(lead, { status: 201 });
  },
});
