import { NextRequest, NextResponse } from 'next/server';
import { cancelCampaign } from '@/lib/campaignSender';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await cancelCampaign(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ cancelled: true });
  } catch (error) {
    console.error('Error cancelling campaign:', error);
    return NextResponse.json({ error: 'Error cancelling campaign' }, { status: 500 });
  }
}
