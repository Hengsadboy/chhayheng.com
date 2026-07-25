import { NextResponse } from 'next/server';
import { getProducts, getCoupons } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { action, amount, productId, couponCode, tran_id, client_id } = await request.json();

    if (action === 'create') {
      let finalAmount = amount;

      // If productId is provided, calculate price strictly on server to prevent manipulation
      if (productId) {
        const products = getProducts();
        const product = products.find(p => p.id === productId);
        if (!product) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        let calcPrice = product.price;
        if (couponCode) {
          const coupons = getCoupons();
          const validCoupon = coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase().trim());
          if (validCoupon) {
            calcPrice = Number((calcPrice * (1 - validCoupon.discountPercentage / 100)).toFixed(2));
          }
        }
        finalAmount = calcPrice.toString();
      }

      if (!finalAmount || parseFloat(finalAmount) <= 0) {
        return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
      }

      // Call create-qr API
      const res = await fetch('https://2008.site/payway/api/create-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://link.payway.com.kh/ABAPAYEA437661K',
          amount: finalAmount
        })
      });

      if (!res.ok) {
        return NextResponse.json({ error: 'Gateway creation failed' }, { status: 502 });
      }

      const data = await res.json();
      return NextResponse.json(data);
    } 
    
    if (action === 'check') {
      if (!tran_id || !client_id) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      // Call check-status API
      const res = await fetch('https://2008.site/payway/api/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tran_id,
          client_id
        })
      });

      if (!res.ok) {
        return NextResponse.json({ error: 'Gateway status check failed' }, { status: 502 });
      }

      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Payment API Proxy Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
