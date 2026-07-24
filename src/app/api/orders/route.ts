import { NextResponse } from 'next/server';
import { getOrders, saveOrders, Order, getProducts, saveProducts } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const orders = getOrders();

    if (email) {
      // If email parameter is provided, filter for customer's specific orders
      const customerOrders = orders.filter(o => o.customerEmail.toLowerCase() === email.toLowerCase());
      return NextResponse.json(customerOrders);
    }

    // Otherwise return all orders (Admin dashboard view)
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { customerEmail, productId, productName, price, requirements } = await request.json();

    if (!customerEmail || !productId || !productName || !price) {
      return NextResponse.json({ error: 'Missing required order details' }, { status: 400 });
    }

    const products = getProducts();
    const product = products.find(p => p.id === productId);

    let status: Order['status'] = 'Pending';
    let deliverables = '';

    // Automated Digital Product Key/Account Claiming
    if (product && product.stockAccounts && product.stockAccounts.length > 0) {
      const claimedAccount = product.stockAccounts.shift();
      if (claimedAccount) {
        status = 'Completed';
        deliverables = claimedAccount;
        saveProducts(products); // save products back with claimed item removed
      }
    }

    const orders = getOrders();
    const newOrder: Order = {
      id: `ord_${Math.floor(100000 + Math.random() * 900000)}`,
      customerEmail,
      productId,
      productName,
      price,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requirements: requirements || '',
      deliverables
    };

    orders.push(newOrder);
    saveOrders(orders);

    // Send order confirmation email asynchronously
    try {
      const { sendOrderNotificationEmail } = await import('@/lib/email');
      await sendOrderNotificationEmail(customerEmail, newOrder.id, productName, price);
    } catch (e) {
      console.error('Failed to send order email:', e);
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }
}
