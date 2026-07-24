import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/db';

export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const newSettings = await req.json();
    saveSettings(newSettings);
    return NextResponse.json({ success: true, settings: newSettings });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
