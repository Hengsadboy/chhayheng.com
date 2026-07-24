import { NextResponse } from 'next/server';
import { getProducts, saveProducts, Product } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = getProducts();
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newProduct: Omit<Product, 'id'> = await request.json();
    const products = getProducts();

    const createdProduct: Product = {
      ...newProduct,
      id: (products.length > 0 ? Math.max(...products.map(p => parseInt(p.id) || 0)) + 1 : 1).toString()
    };

    products.push(createdProduct);
    saveProducts(products);

    return NextResponse.json(createdProduct, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
