import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";

// Rutas públicas que no requieren sesión
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/webhooks",
  "/api/health",
  "/api/carriers/providers",
];

// Prefijos públicos (cualquier ruta que empiece por estos)
const PUBLIC_PREFIXES = ["/_next", "/static", "/favicon.ico", "/api/webhooks/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas exactas
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Permitir prefijos públicos
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Verificar sesión para el resto
  const session = await getSession();
  if (!session) {
    // Si es una API route, retornar 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Sesión requerida. Inicia sesión en /login" },
        { status: 401 }
      );
    }
    // Si es una página, redirigir a login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas de página y API excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - archivos estáticos en la raíz de public/
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
