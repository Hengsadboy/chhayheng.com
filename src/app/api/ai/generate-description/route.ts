import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { productName, category } = await request.json();

    if (!productName || typeof productName !== 'string') {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const nameLower = productName.toLowerCase();

    let description = '';
    let features: string[] = [];

    if (nameLower.includes('youtube')) {
      description = `Get full YouTube Premium membership features on your personal account. Enjoy ad-free video playback, background audio play, offline video downloads, and full access to YouTube Music Premium.`;
      features = [
        '100% Ad-free YouTube video playback',
        'Background play & screen-off listening',
        'Full YouTube Music Premium access included',
        'Instant activation on your personal email'
      ];
    } else if (nameLower.includes('discord') || nameLower.includes('nitro')) {
      description = `Unlock premium Discord Nitro features. Get 2 Server Boosts, custom emojis & stickers anywhere, HD 60FPS screen streaming, 100MB file uploads, and custom profile banners.`;
      features = [
        '2 Free Server Boosts included',
        'Custom emojis & animated stickers anywhere',
        'HD 60FPS screen sharing & video streaming',
        '100MB file upload limit'
      ];
    } else if (nameLower.includes('telegram')) {
      description = `Upgrade to Telegram Premium for maximum speed and exclusive features. Enjoy 4GB file uploads, 2x faster download speeds, voice-to-text conversion, exclusive stickers, and badge icons.`;
      features = [
        'Doubled limits & 4GB file upload capacity',
        'Faster download speeds & voice-to-text',
        'Exclusive animated stickers & reaction emojis',
        'Official Premium Star Badge profile icon'
      ];
    } else if (nameLower.includes('spotify')) {
      description = `Listen to unlimited music without interruptions with Spotify Premium. Enjoy ad-free music playback, unlimited song skips, offline song downloads, and high-fidelity audio quality.`;
      features = [
        'Ad-free music listening with unlimited skips',
        'Download songs for offline listening',
        'Ultra High Fidelity audio quality (320kbps)',
        'Play any track anytime on mobile or desktop'
      ];
    } else if (nameLower.includes('netflix') || nameLower.includes('video')) {
      description = `Watch unlimited movies, TV shows, and anime in Ultra HD 4K quality. Fast instant activation with full private profile access and multi-device support.`;
      features = [
        'Ultra HD 4K + HDR streaming quality',
        'Watch on TV, Laptop, Phone, or Tablet',
        'Private profile PIN lock option',
        'Unlimited movies & TV shows without ads'
      ];
    } else if (nameLower.includes('bot')) {
      description = `High-performance automated bot service engineered for 99.9% uptime and ultra-fast processing. Features fully configurable admin controls, real-time logging, and smooth user interactions.`;
      features = [
        '24/7 Automated execution with high uptime',
        'Custom administrative control panel',
        'Instant real-time notifications & logging',
        'Secure multi-threaded architecture'
      ];
    } else {
      description = `Premium digital service for ${productName}. Built for high performance, maximum reliability, and fast instant delivery. Engineered to deliver exceptional quality and smooth user experience.`;
      features = [
        'Instant delivery & fast processing',
        '100% Genuine and fully guaranteed',
        '24/7 Priority support included',
        'Smooth & seamless activation'
      ];
    }

    return NextResponse.json({
      success: true,
      description,
      features
    });

  } catch (error) {
    console.error('AI Description Generator Error:', error);
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 });
  }
}
