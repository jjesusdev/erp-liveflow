import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ...product, price: Number(product.price) });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Error fetching product' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const data: any = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.category !== undefined) data.category = body.category || null;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.isAvailable !== undefined) data.isAvailable = Boolean(body.isAvailable);

    if (body.price !== undefined && body.price !== null && body.price !== '') {
      const numericPrice = Number(body.price);
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return NextResponse.json({ error: 'Precio invalido' }, { status: 400 });
      }
      data.price = numericPrice;
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ...product, price: Number(product.price) });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Error updating product' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Error deleting product' }, { status: 500 });
  }
}