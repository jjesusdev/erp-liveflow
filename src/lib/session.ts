import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "lf_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

interface SessionPayload {
  operatorId: string;
  role: string;
  issuedAt: number;
}

/**
 * Retorna el secreto de sesión, validando que esté configurado.
 * Se valida en runtime (al firmar una sesión), no en el top-level del módulo,
 * para no romper el build de Next.js cuando la variable de entorno no está
 * disponible durante la recolección de datos de página.
 */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET no está configurada en las variables de entorno");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function serializeSession(session: SessionPayload): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function deserializeSession(token: string): SessionPayload | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  if (!timingSafeEqual(Buffer.from(signature, "base64url"), Buffer.from(expected, "base64url"))) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as SessionPayload;
    if (Date.now() - session.issuedAt > SESSION_TTL_MS) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Crea y establece la cookie de sesión firmada en la respuesta.
 * Se llama desde los route handlers de API tras autenticar al operador.
 */
export async function createSession(operatorId: string, role: string): Promise<string> {
  const session: SessionPayload = {
    operatorId,
    role,
    issuedAt: Date.now(),
  };
  const token = serializeSession(session);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return token;
}

/**
 * Lee y valida la cookie de sesión de la request actual.
 * Retorna null si no hay sesión válida.
 */
export async function getSession(): Promise<{ operatorId: string; role: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = deserializeSession(token);
  if (!session) return null;

  return { operatorId: session.operatorId, role: session.role };
}

/**
 * Elimina la cookie de sesión (logout).
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Verifica si existe una sesión válida sin retornar los datos.
 */
export async function hasSession(): Promise<boolean> {
  return (await getSession()) !== null;
}

/**
 * Retorna el operatorId de la sesión actual, o null si no hay sesión válida.
 * Se usa en API routes para registrar la auditoría del operador autenticado.
 */
export async function getOperatorIdFromSession(): Promise<string | null> {
  const session = await getSession();
  return session ? session.operatorId : null;
}
