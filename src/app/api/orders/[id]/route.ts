import { NextResponse } from 'next/server';
import { getOrders, saveOrders, Order, verifyAdminRequest } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const { status, deliverables } = await request.json();
    const orders = getOrders();
    const index = orders.findIndex(o => o.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updatedOrder: Order = {
      ...orders[index],
      status: status !== undefined ? status : orders[index].status,
      deliverables: deliverables !== undefined ? deliverables : orders[index].deliverables,
      updatedAt: new Date().toISOString()
    };

    orders[index] = updatedOrder;
    saveOrders(orders);

    return NextResponse.json(updatedOrder);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
