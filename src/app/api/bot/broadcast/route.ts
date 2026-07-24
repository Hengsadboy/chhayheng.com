import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const settings = getSettings();
    const token = settings.botToken;
    if (!token) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    // Read tg_users.json directly
    const TG_USERS_FILE = path.join(process.cwd(), 'data', 'tg_users.json');
    let tgUsers: Record<string, any> = {};
    if (fs.existsSync(TG_USERS_FILE)) {
      tgUsers = JSON.parse(fs.readFileSync(TG_USERS_FILE, 'utf-8'));
    }

    const userIds = Object.keys(tgUsers);
    if (userIds.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No users found to broadcast to.' });
    }

    let successCount = 0;
    let failCount = 0;

    // We use Promise.allSettled to send concurrently, but carefully if many users
    const promises = userIds.map(userId => 
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: userId,
          text: `📢 **Announcement**\n\n${message}`,
          parse_mode: 'Markdown'
        })
      }).then(res => {
        if (res.ok) successCount++;
        else failCount++;
      }).catch(() => failCount++)
    );

    await Promise.allSettled(promises);

    return NextResponse.json({ 
      success: true, 
      count: successCount, 
      failed: failCount 
    });

  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
