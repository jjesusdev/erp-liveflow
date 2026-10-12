import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { sendCampaign } from "@/lib/campaignSender";

export const POST = apiHandler({
  handler: async (_req, _body, context) => {
    const { id } = await context.params;
    const result = await sendCampaign(id);

    if (!result.started) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ started: true });
  },
});
