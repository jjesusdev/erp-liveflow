import { cookies } from "next/headers";

const SESSION_COOKIE = "lf_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

interface SessionPayload {
  operatorId: string;
  role: string;
  orgId: string;
  issuedAt: number;
}

/**
 * El secreto se valida en runtime (al firmar/verificar), no en el top-level,
 * para no romper el build cuando la variable no esté disponible.
 */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET no está configurada en las variables de entorno");
  }
  return secret;
}

const encoder = new TextEncoder();

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

/** Comparación en tiempo constante sobre bytes (Edge-compatible). */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function serializeSession(session: SessionPayload): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)));
  return `${payload}.${await sign(payload)}`;
}

async function deserializeSession(token: string): Promise<SessionPayload | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const received = fromBase64Url(signature);
  const expected = fromBase64Url(await sign(payload));
  if (!constantTimeEqual(received, expected)) return null;

  try {
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as SessionPayload;
    if (Date.now() - session.issuedAt > SESSION_TTL_MS) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Crea y establece la cookie de sesión firmada en la respuesta.
 * Guarda operatorId, role y orgId en la sesión.
 */
export async function createSession(
  operatorId: string,
  role: string,
  orgId: string
): Promise<string> {
  const token = await serializeSession({
    operatorId,
    role,
    orgId,
    issuedAt: Date.now(),
  });

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

/** Lee y valida la cookie de sesión de la request actual. */
export async function getSession(): Promise<{
  operatorId: string;
  orgId: string;
  role: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await deserializeSession(token);
  if (!session) return null;

  return { operatorId: session.operatorId, orgId: session.orgId, role: session.role };
}

/** Contexto del operador autenticado: operatorId, orgId y role. */
export async function getOperatorContext(): Promise<{
  operatorId: string;
  orgId: string;
  role: string;
} | null> {
  return getSession();
}

/** Elimina la cookie de sesión (logout). */
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

/** Verifica si existe una sesión válida sin retornar los datos. */
export async function hasSession(): Promise<boolean> {
  return (await getSession()) !== null;
}
