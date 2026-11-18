import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { liveSessionUpdateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/session";
import { whereOrg } from "@/lib/org";
import { getIO } from "@/lib/realtime/events";

export const PATCH = apiHandler({
  body: liveSessionUpdateSchema,
  handler: async (req: NextRequest, body, context) => {
    const { id } = await context.params;
    const ctx = await getOperatorContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const orgId = ctx.orgId;

    const existing = await prisma.liveSession.findFirst({
      where: { ...whereOrg(orgId), id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const data: any = {};
    if (body.status === "ENDED" || body.status === "ACTIVE") {
      data.status = body.status;
      if (body.status === "ENDED") {
        data.endedAt = new Date();
      }
    }
    if (body.title !== undefined) data.title = body.title;
    if (body.notes !== undefined) data.notes = body.notes;

    const session = await prisma.liveSession.update({
      where: { ...whereOrg(orgId), id },
      data,
    });

    getIO()?.emit("live:session:updated", session);

    return NextResponse.json(session);
  },
});
