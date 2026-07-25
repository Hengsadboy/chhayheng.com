import { NextResponse } from 'next/server';
import { getUsers, saveUsers, verifyAdminRequest, User } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const websiteUsers = getUsers();

    // Read Telegram bot users directly
    const TG_USERS_FILE = path.join(process.cwd(), 'data', 'tg_users.json');
    let tgUsersMap: Record<string, any> = {};
    if (fs.existsSync(TG_USERS_FILE)) {
      try {
        tgUsersMap = JSON.parse(fs.readFileSync(TG_USERS_FILE, 'utf-8'));
      } catch (e) {
        console.error('Failed to parse tg_users.json', e);
      }
    }

    const tgUsers = Object.entries(tgUsersMap).map(([id, data]) => ({
      id,
      balance: data.balance || 0,
      username: data.username || '',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      ordersCount: Array.isArray(data.orders) ? data.orders.length : 0
    }));

    return NextResponse.json({
      success: true,
      websiteUsers,
      tgUsers
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { type, id, email } = await request.json();

    if (type === 'website' && email) {
      const users = getUsers();
      const updated = users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
      saveUsers(updated);
      return NextResponse.json({ success: true, message: 'User deleted' });
    }

    if (type === 'telegram' && id) {
      const TG_USERS_FILE = path.join(process.cwd(), 'data', 'tg_users.json');
      if (fs.existsSync(TG_USERS_FILE)) {
        const tgUsersMap = JSON.parse(fs.readFileSync(TG_USERS_FILE, 'utf-8'));
        delete tgUsersMap[id];
        fs.writeFileSync(TG_USERS_FILE, JSON.stringify(tgUsersMap, null, 2), 'utf-8');
      }
      return NextResponse.json({ success: true, message: 'Telegram user deleted' });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
