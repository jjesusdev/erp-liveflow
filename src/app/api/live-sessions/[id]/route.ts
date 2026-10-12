import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { liveSessionUpdateSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

export const PATCH = apiHandler({
  body: liveSessionUpdateSchema,
  handler: async (req: NextRequest, body, context) => {
    const { id } = await context.params;

    const existing = await prisma.liveSession.findUnique({ where: { id } });
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
      where: { id },
      data,
    });

    const io = (globalThis as any).io;
    io?.emit("live:session:updated", session);

    return NextResponse.json(session);
  },
});
