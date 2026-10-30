import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

/** POST /api/auth/logout - Cerrar sesión de operador */
export const POST = async () => {
  await clearSession();
  return NextResponse.json({ ok: true, message: "Sesión cerrada" });
};
