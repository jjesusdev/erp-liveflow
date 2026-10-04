import { NextRequest, NextResponse } from 'next/server';
import { sendCampaign } from '@/lib/campaignSender';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await sendCampaign(id);

    if (!result.started) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ started: true });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return NextResponse.json({ error: 'Error sending campaign' }, { status: 500 });
  }
}
