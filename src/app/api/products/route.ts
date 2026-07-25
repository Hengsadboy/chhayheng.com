import { NextResponse } from 'next/server';
import { getProducts, saveProducts, Product, verifyAdminRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const products = getProducts();
    const isAdmin = verifyAdminRequest(request);

    if (isAdmin) {
      return NextResponse.json(products);
    }

    // Sanitize product list for public users: remove stockAccounts credentials
    const sanitizedProducts = products.map(p => {
      const { stockAccounts, ...rest } = p;
      return {
        ...rest,
        // Only return count, never leak credentials
        stockAccounts: undefined
      };
    });

    return NextResponse.json(sanitizedProducts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

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
