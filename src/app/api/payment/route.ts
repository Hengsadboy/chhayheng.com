import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { action, amount, tran_id, client_id } = await request.json();

    if (action === 'create') {
      // Call create-qr API
      const res = await fetch('https://2008.site/payway/api/create-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://link.payway.com.kh/ABAPAYEA437661K',
          amount: amount || '0.01' // fallback for safety
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
