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

    // Get current balance, orders, and sales analytics for the reseller dashboard
    if (action === 'details') {
      const { password } = body;
      if (!email && !apiKey) return NextResponse.json({ success: false, message: 'Email or API Key is required' }, { status: 400 });
      const users = getUsers();
      const user = users.find(u => 
        (email && u.email.toLowerCase() === email.toLowerCase()) || 
        (apiKey && u.apiKey === apiKey)
      );
      if (!user || user.role !== 'reseller') return NextResponse.json({ success: false, message: 'Reseller account not found' }, { status: 404 });
      
      // Verify password or apiKey before revealing credentials
      if (password && user.passwordHash !== password && user.apiKey !== apiKey) {
        return NextResponse.json({ success: false, message: 'Unauthorized access' }, { status: 401 });
      }

      // Fetch reseller's orders
      const allOrders = getOrders();
      const resellerOrders = allOrders.filter(o => o.customerEmail.toLowerCase() === user.email.toLowerCase());

      // Calculate weekly and monthly sales
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const weeklySales = resellerOrders
        .filter(o => new Date(o.createdAt) >= oneWeekAgo)
        .reduce((sum, o) => sum + o.price, 0);

      const monthlySales = resellerOrders
        .filter(o => new Date(o.createdAt) >= oneMonthAgo)
        .reduce((sum, o) => sum + o.price, 0);

      const totalSales = resellerOrders.reduce((sum, o) => sum + o.price, 0);

      return NextResponse.json({ 
        success: true, 
        balance: user.balance || 0, 
        apiKey: user.apiKey,
        orders: resellerOrders,
        stats: {
          totalOrders: resellerOrders.length,
          totalSales: Number(totalSales.toFixed(2)),
          weeklySales: Number(weeklySales.toFixed(2)),
          monthlySales: Number(monthlySales.toFixed(2))
        }
      });
    }

    // Get catalog of products with 20% wholesale discount
    if (action === 'products') {
      const products = getProducts();
      const wholesaleProducts = products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        retailPrice: p.price,
        wholesalePrice: Number((p.price * 0.8).toFixed(2)),
        category: p.category,
        deliveryTime: p.deliveryTime,
        stockCount: p.stockAccounts ? p.stockAccounts.length : 0,
        image: p.image,
        requiresInput: p.requiresInput || false,
        inputLabel: p.inputLabel || '',
        inputPlaceholder: p.inputPlaceholder || ''
      }));
      return NextResponse.json({ success: true, products: wholesaleProducts });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Reseller API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
