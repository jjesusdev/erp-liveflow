import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const available = searchParams.get('available');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: any = {};

    if (available !== null) {
      where.isAvailable = available === 'true';
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      products.map((product) => ({ ...product, price: Number(product.price) }))
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Error fetching products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, price, currency, imageUrl, category, isAvailable } = body;

    if (!name || price === undefined || price === null || price === '') {
      return NextResponse.json(
        { error: 'Nombre y precio son obligatorios' },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return NextResponse.json({ error: 'Precio invalido' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price: numericPrice,
        currency: currency || 'MXN',
        imageUrl: imageUrl || null,
        category: category || null,
        isAvailable: isAvailable ?? true,
      },
    });

    return NextResponse.json({ ...product, price: Number(product.price) });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Error creating product' }, { status: 500 });
  }
}