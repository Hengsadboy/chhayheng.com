import { NextResponse } from 'next/server';
import { getGiveaways, saveGiveaways, verifyAdminRequest, Giveaway } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const giveaways = getGiveaways();
    const isAdmin = verifyAdminRequest(request);

    const publicGiveaways = giveaways.map(g => {
      if (isAdmin) return g;
      return {
        id: g.id,
        title: g.title,
        description: g.description,
        prize: g.prize,
        winnerCount: g.winnerCount,
        endTime: g.endTime,
        status: g.status,
        entriesCount: g.entries.length,
        winners: g.winners || [],
        createdAt: g.createdAt
      };
    });

    return NextResponse.json({ success: true, giveaways: publicGiveaways });
  } catch (error) {
    console.error('Fetch giveaways error:', error);
    return NextResponse.json({ error: 'Failed to fetch giveaways' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, giveawayId, userIdentifier, title, description, prize, winnerCount, durationHours } = body;

    // User Enter Action
    if (action === 'enter') {
      if (!giveawayId || !userIdentifier) {
        return NextResponse.json({ success: false, message: 'Giveaway ID and User identifier are required' }, { status: 400 });
      }

      const giveaways = getGiveaways();
      const giveaway = giveaways.find(g => g.id === giveawayId);

      if (!giveaway) {
        return NextResponse.json({ success: false, message: 'Giveaway not found' }, { status: 404 });
      }

      if (giveaway.status !== 'active') {
        return NextResponse.json({ success: false, message: 'This giveaway has ended' }, { status: 400 });
      }

      if (new Date(giveaway.endTime) <= new Date()) {
        giveaway.status = 'ended';
        saveGiveaways(giveaways);
        return NextResponse.json({ success: false, message: 'This giveaway has expired' }, { status: 400 });
      }

      const lowerUser = userIdentifier.toLowerCase().trim();
      if (giveaway.entries.some(e => e.toLowerCase() === lowerUser)) {
        return NextResponse.json({ success: false, message: 'You have already entered this giveaway!' }, { status: 400 });
      }

      giveaway.entries.push(lowerUser);
      saveGiveaways(giveaways);

      return NextResponse.json({ 
        success: true, 
        message: 'Successfully entered the giveaway! Good luck! 🎉',
        entriesCount: giveaway.entries.length
      });
    }

    // ADMIN ACTIONS BELOW (Requires Admin Verification)
    if (!verifyAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    // Admin Create Action
    if (action === 'create') {
      if (!title || !prize) {
        return NextResponse.json({ success: false, message: 'Title and Prize are required' }, { status: 400 });
      }

      const giveaways = getGiveaways();
      const hours = parseInt(durationHours) || 24;
      const endTime = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const newGiveaway: Giveaway = {
        id: `gw_${Date.now()}`,
        title,
        description: description || '',
        prize,
        winnerCount: parseInt(winnerCount) || 1,
        endTime,
        status: 'active',
        entries: [],
        winners: [],
        createdAt: new Date().toISOString()
      };

      giveaways.unshift(newGiveaway);
      saveGiveaways(giveaways);

      return NextResponse.json({ success: true, message: 'Giveaway created successfully', giveaway: newGiveaway });
    }

    // Admin Draw Winner Action (Random Selection)
    if (action === 'draw') {
      if (!giveawayId) {
        return NextResponse.json({ success: false, message: 'Giveaway ID is required' }, { status: 400 });
      }

      const giveaways = getGiveaways();
      const giveaway = giveaways.find(g => g.id === giveawayId);

      if (!giveaway) {
        return NextResponse.json({ success: false, message: 'Giveaway not found' }, { status: 404 });
      }

      if (giveaway.entries.length === 0) {
        return NextResponse.json({ success: false, message: 'No entries registered for this giveaway' }, { status: 400 });
      }

      // Random Shuffle & Pick Winners
      const pool = [...giveaway.entries];
      const selectedWinners: string[] = [];
      const count = Math.min(giveaway.winnerCount, pool.length);

      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        selectedWinners.push(pool[randomIndex]);
        pool.splice(randomIndex, 1);
      }

      giveaway.status = 'ended';
      giveaway.winners = selectedWinners;
      saveGiveaways(giveaways);

      return NextResponse.json({
        success: true,
        message: `Successfully picked ${selectedWinners.length} winner(s)! 🎉`,
        winners: selectedWinners
      });
    }

    // Admin Delete Action
    if (action === 'delete') {
      if (!giveawayId) {
        return NextResponse.json({ success: false, message: 'Giveaway ID is required' }, { status: 400 });
      }

      const giveaways = getGiveaways();
      const updated = giveaways.filter(g => g.id !== giveawayId);
      saveGiveaways(updated);

      return NextResponse.json({ success: true, message: 'Giveaway deleted' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Giveaway API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
