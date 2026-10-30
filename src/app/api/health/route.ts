import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health - Endpoint de salud del sistema.
 *
 * Verifica el estado de las dependencias críticas:
 * - Base de datos (Prisma)
 * - WhatsApp (cliente Baileys global)
 * - Workers / Socket.io (io global)
 *
 * Retorna 200 si todo está bien, 200 con status "degradado" si algo falla,
 * 503 si la base de datos no responde.
 */
export async function GET() {
  const dependencies: Record<string, { status: "up" | "down"; detail?: string }> = {};

  // ── Base de datos ──
  let dbStatus: "up" | "down" = "down";
  let dbDetail: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "up";
  } catch (error) {
    dbDetail = error instanceof Error ? error.message : String(error);
  }
  dependencies.db = { status: dbStatus, ...(dbDetail ? { detail: dbDetail } : {}) };

  // ── WhatsApp (Baileys) ──
  const whatsappClient = (globalThis as any)?.whatsappClient;
  let whatsappStatus: "up" | "down" = "down";
  let whatsappDetail: string | undefined;
  if (whatsappClient) {
    try {
      const authState = whatsappClient.authState?.state ?? "unknown";
      whatsappStatus = authState === "open" ? "up" : "down";
      whatsappDetail = `authState: ${authState}`;
    } catch (error) {
      whatsappDetail = error instanceof Error ? error.message : String(error);
    }
  } else {
    whatsappDetail = "cliente no inicializado";
  }
  dependencies.whatsapp = {
    status: whatsappStatus,
    ...(whatsappDetail ? { detail: whatsappDetail } : {}),
  };

  // ── Workers / Socket.io ──
  const io = (globalThis as any)?.io;
  let workersStatus: "up" | "down" = "down";
  let workersDetail: string | undefined;
  if (io) {
    workersStatus = "up";
    workersDetail = "socket.io inicializado";
  } else {
    workersDetail = "no inicializado";
  }
  dependencies.workers = {
    status: workersStatus,
    ...(workersDetail ? { detail: workersDetail } : {}),
  };

  const allUp = Object.values(dependencies).every((d) => d.status === "up");
  const dbUp = dependencies.db.status === "up";

  if (!dbUp) {
    return NextResponse.json({ status: "unhealthy", dependencies }, { status: 503 });
  }

  return NextResponse.json({
    status: allUp ? "ok" : "degraded",
    dependencies,
  });
}
