import { NextResponse } from 'next/server';
import { getOrders, saveOrders, Order, getProducts, saveProducts, verifyAdminRequest } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const isAdmin = verifyAdminRequest(request);
    const orders = getOrders();

    if (isAdmin) {
      return NextResponse.json(orders);
    }

    if (email) {
      // Return specific customer orders
      const customerOrders = orders.filter(o => o.customerEmail.toLowerCase() === email.toLowerCase());
      return NextResponse.json(customerOrders);
    }

    // Reject unauthenticated requests attempting to list all orders
    return NextResponse.json({ error: 'Unauthorized: Email or Admin auth required' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { customerEmail, productId, productName, price, requirements, tran_id, client_id } = await request.json();

    if (!customerEmail || !productId || !productName || price === undefined) {
      return NextResponse.json({ error: 'Missing required order details' }, { status: 400 });
    }

    const isAdmin = verifyAdminRequest(request);
    const products = getProducts();
    const product = products.find(p => p.id === productId);

    let status: Order['status'] = 'Pending';
    let deliverables = '';
    let isPaymentVerified = false;

    // Admin can manually create completed orders, or verify via PayWay gateway
    if (isAdmin) {
      isPaymentVerified = true;
    } else if (tran_id && client_id) {
      try {
        const checkRes = await fetch('https://2008.site/payway/api/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tran_id, client_id })
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (
            checkData.meta?.payment_approved === true ||
            checkData.meta?.finished === true ||
            checkData.data?.message?.message === 'Approved'
          ) {
            isPaymentVerified = true;
          }
        }
      } catch (e) {
        console.error('PayWay verification failed:', e);
      }
    }

    // Automated Digital Product Key/Account Claiming ONLY IF payment is verified
    if (isPaymentVerified && product && product.stockAccounts && product.stockAccounts.length > 0) {
      const claimedAccount = product.stockAccounts.shift();
      if (claimedAccount) {
        status = 'Completed';
        deliverables = claimedAccount;
        saveProducts(products); // save products back with claimed item removed
      }
    } else if (!isPaymentVerified && product && product.stockAccounts) {
      // Reject unverified order creation attempts trying to claim digital stock
      return NextResponse.json({ error: 'Payment verification required before claiming stock' }, { status: 402 });
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
      await sendOrderNotificationEmail(customerEmail, newOrder.id, productName, price, deliverables);
    } catch (e) {
      console.error('Failed to send order email:', e);
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }
}
