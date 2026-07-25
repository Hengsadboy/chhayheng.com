import { NextResponse } from 'next/server';
import { getProducts, saveProducts, Product, verifyAdminRequest } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const products = getProducts();
    const product = products.find(p => p.id === id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const isAdmin = verifyAdminRequest(request);
    if (isAdmin) {
      return NextResponse.json({
        ...product,
        stockCount: product.stockAccounts ? product.stockAccounts.length : 0
      });
    }

    const { stockAccounts, ...rest } = product;
    return NextResponse.json({
      ...rest,
      stockCount: stockAccounts ? stockAccounts.length : 0
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const updatedData: Omit<Product, 'id'> = await request.json();
    const products = getProducts();
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updatedProduct: Product = {
      ...updatedData,
      id
    };

    products[index] = updatedProduct;
    saveProducts(products);

    return NextResponse.json(updatedProduct);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const products = getProducts();
    const filteredProducts = products.filter(p => p.id !== id);

    if (products.length === filteredProducts.length) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    saveProducts(filteredProducts);
    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
