import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { cancelCampaign } from "@/lib/campaignSender";

export const POST = apiHandler({
  handler: async (_req, _body, context) => {
    const { id } = await context.params;
    const result = await cancelCampaign(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ cancelled: true });
  },
});
