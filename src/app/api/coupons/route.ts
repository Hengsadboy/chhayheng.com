import { NextResponse } from 'next/server';
import { getCoupons, saveCoupons, verifyAdminRequest } from '@/lib/db';

export async function GET() {
  try {
    const coupons = getCoupons();
    return NextResponse.json(coupons);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { action, coupon } = data;

    if (action === 'create') {
      if (!verifyAdminRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
      }
      const coupons = getCoupons();
      // Ensure unique ID and code
      const newCoupon = {
        id: Date.now().toString(),
        code: coupon.code.toUpperCase().trim(),
        discountPercentage: Number(coupon.discountPercentage)
      };
      coupons.push(newCoupon);
      saveCoupons(coupons);
      return NextResponse.json({ success: true, coupon: newCoupon });
    }

    if (action === 'delete') {
      if (!verifyAdminRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
      }
      let coupons = getCoupons();
      coupons = coupons.filter(c => c.id !== coupon.id);
      saveCoupons(coupons);
      return NextResponse.json({ success: true });
    }
    
    if (action === 'validate') {
      const coupons = getCoupons();
      const code = coupon.code.toUpperCase().trim();
      const validCoupon = coupons.find(c => c.code === code);
      if (validCoupon) {
        return NextResponse.json({ success: true, coupon: validCoupon });
      } else {
        return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
