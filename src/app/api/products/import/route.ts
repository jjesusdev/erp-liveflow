import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { productImportSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export const POST = apiHandler({
  body: productImportSchema,
  handler: async (req: NextRequest, body) => {
    const { products } = body;

    const createdList = [];

    for (const item of products) {
      const name = item.name?.trim();
      const price = parseFloat(String(item.price));
      if (!name || isNaN(price) || price < 0) continue;

      const created = await prisma.product.create({
        data: {
          name,
          description: item.description?.trim() || null,
          price,
          currency: item.currency || "MXN",
          category: item.category?.trim() || null,
          stock: parseInt(String(item.stock), 10) || 10,
          imageUrl: item.imageUrl?.trim() || null,
          isActive: true,
          isAvailable: true,
        },
      });
      createdList.push(created);
    }

    await logActivity({
      action: "BULK_PRODUCTS_IMPORTED",
      details: {
        totalImported: createdList.length,
      },
    });

    return NextResponse.json({
      success: true,
      importedCount: createdList.length,
      products: createdList,
    });
  },
});
