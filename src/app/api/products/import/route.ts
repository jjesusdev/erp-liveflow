import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { products } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Lista de productos inválida' }, { status: 400 });
    }

    const createdList = [];

    for (const item of products) {
      const name = item.name?.trim();
      const price = parseFloat(item.price);
      if (!name || isNaN(price) || price < 0) continue;

      const created = await prisma.product.create({
        data: {
          name,
          description: item.description?.trim() || null,
          price,
          currency: item.currency || 'MXN',
          category: item.category?.trim() || null,
          stock: parseInt(item.stock, 10) || 10,
          imageUrl: item.imageUrl?.trim() || null,
          isActive: true,
          isAvailable: true,
        },
      });
      createdList.push(created);
    }

    await logActivity({
      action: 'BULK_PRODUCTS_IMPORTED',
      details: {
        totalImported: createdList.length,
      },
    });

    return NextResponse.json({
      success: true,
      importedCount: createdList.length,
      products: createdList,
    });
  } catch (error) {
    console.error('Error importing products:', error);
    return NextResponse.json({ error: 'Error importando productos' }, { status: 500 });
  }
}