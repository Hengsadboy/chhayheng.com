import { NextResponse } from 'next/server';
import { getSettings, saveSettings, verifyAdminRequest } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const settings = getSettings();
    if (verifyAdminRequest(request)) {
      return NextResponse.json(settings);
    }
    // Redact sensitive Telegram credentials for public users
    return NextResponse.json({ khqrLink: settings.khqrLink });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!verifyAdminRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    const newSettings = await req.json();
    saveSettings(newSettings);
    return NextResponse.json({ success: true, settings: newSettings });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
