import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUsers, saveUsers, getProducts, saveProducts, getOrders, saveOrders, Order } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, tran_id, client_id, amount, apiKey, productId, requirements } = body;

    // Helper to verify payment via PayWay
    const verifyPayment = async (tId: string, cId: string) => {
      const res = await fetch('https://2008.site/payway/api/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tran_id: tId, client_id: cId })
      });
      if (!res.ok) return false;
      const data = await res.json();
      return (
        data.meta?.payment_approved === true ||
        data.meta?.finished === true ||
        data.data?.message?.message === 'Approved'
      );
    };

    if (action === 'register') {
      if (!email || !tran_id || !client_id) {
        return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
      }

      const isValid = await verifyPayment(tran_id, client_id);
      if (!isValid) return NextResponse.json({ success: false, message: 'Payment not approved' }, { status: 400 });

      const users = getUsers();
      const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (userIndex === -1) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

      // Generate a random API key
      const newApiKey = 'sk_' + crypto.randomBytes(24).toString('hex');
      
      users[userIndex].role = 'reseller';
      users[userIndex].balance = 0;
      users[userIndex].apiKey = newApiKey;
      saveUsers(users);

      return NextResponse.json({ success: true, message: 'Successfully registered as a reseller.', apiKey: newApiKey });
    }

    if (action === 'topup') {
      if (!email || !tran_id || !client_id || !amount) {
        return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
      }

      const isValid = await verifyPayment(tran_id, client_id);
      if (!isValid) return NextResponse.json({ success: false, message: 'Payment not approved' }, { status: 400 });

      const users = getUsers();
      const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (userIndex === -1) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      if (users[userIndex].role !== 'reseller') return NextResponse.json({ success: false, message: 'Not a reseller' }, { status: 403 });

      users[userIndex].balance = (users[userIndex].balance || 0) + parseFloat(amount);
      saveUsers(users);

      return NextResponse.json({ success: true, message: `Successfully topped up $${amount}`, newBalance: users[userIndex].balance });
    }

    if (action === 'order') {
      if (!apiKey || !productId) {
        return NextResponse.json({ success: false, message: 'API Key and productId are required' }, { status: 400 });
      }

      const users = getUsers();
      const reseller = users.find(u => u.apiKey === apiKey && u.role === 'reseller');
      if (!reseller) return NextResponse.json({ success: false, message: 'Invalid API Key' }, { status: 401 });

      const products = getProducts();
      const product = products.find(p => p.id === productId);
      if (!product) return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });

      // Apply 20% discount for resellers
      const discountedPrice = Number((product.price * 0.8).toFixed(2));
      const currentBalance = reseller.balance || 0;

      if (currentBalance < discountedPrice) {
        return NextResponse.json({ success: false, message: `Insufficient balance. Required: $${discountedPrice}, Available: $${currentBalance}` }, { status: 402 });
      }

      // Deduct balance
      reseller.balance = Number((currentBalance - discountedPrice).toFixed(2));
      saveUsers(users);

      // Process Order logic
      let status: Order['status'] = 'Pending';
      let deliverables = '';

      if (product.stockAccounts && product.stockAccounts.length > 0) {
        const claimedAccount = product.stockAccounts.shift();
        if (claimedAccount) {
          status = 'Completed';
          deliverables = claimedAccount;
          saveProducts(products);
        }
      }

      const orders = getOrders();
      const newOrder: Order = {
        id: `ord_${Math.floor(100000 + Math.random() * 900000)}`,
        customerEmail: reseller.email,
        productId,
        productName: product.name,
        price: discountedPrice,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        requirements: requirements || 'API Order',
        deliverables
      };

      orders.push(newOrder);
      saveOrders(orders);

      return NextResponse.json({ 
        success: true, 
        message: 'Order placed successfully', 
        order: newOrder,
        remainingBalance: reseller.balance
      });
    }

    // Get current balance and details for the dashboard
    if (action === 'details') {
      if (!email) return NextResponse.json({ success: false }, { status: 400 });
      const users = getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user || user.role !== 'reseller') return NextResponse.json({ success: false }, { status: 404 });
      
      return NextResponse.json({ 
        success: true, 
        balance: user.balance, 
        apiKey: user.apiKey 
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Reseller API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
