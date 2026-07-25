import { NextResponse } from 'next/server';
import { getProducts, saveProducts, Product, verifyAdminRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const products = getProducts();
    const isAdmin = verifyAdminRequest(request);

    if (isAdmin) {
      const adminProducts = products.map(p => ({
        ...p,
        stockCount: p.stockAccounts ? p.stockAccounts.length : 0
      }));
      return NextResponse.json(adminProducts);
    }

    // Sanitize product list for public users: remove stockAccounts credentials, but include stockCount
    const sanitizedProducts = products.map(p => {
      const { stockAccounts, ...rest } = p;
      return {
        ...rest,
        stockCount: stockAccounts ? stockAccounts.length : 0,
        stockAccounts: undefined
      };
    });

    return NextResponse.json(sanitizedProducts, {
      headers: {
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=60'
      }
    });
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
