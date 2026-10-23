import { prisma } from "./prisma";
import { scrypt as _scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt as any);

/**
 * Genera un hash scrypt de la contraseña.
 * Devuelve un Buffer en base64 que se almacenará en Operator.passwordHash.
 * Formato: salt (16 bytes) + derivedKey (32 bytes) concatenados en base64.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await randomBytes(16);
  const derivedKey = await scrypt(password, salt, 32);
  const combined = Buffer.concat([salt, derivedKey]);
  return combined.toString("base64");
}

/**
 * Verifica una contraseña contra un hash generado por hashPassword.
 * El hash se espera en base64 (salt + derivedKey concatenados).
 */
export async function comparePassword(password: string, hashBase64: string): Promise<boolean> {
  try {
    const combined = Buffer.from(hashBase64, "base64");
    if (combined.length < 48) return false; // salt(16) + key(32) mínimo

    const salt = combined.slice(0, 16);
    const derivedKey = combined.slice(16);
    const derived = await scrypt(password, salt, 32);
    return derivedKey.equals(derived);
  } catch {
    return false;
  }
}

/**
 * Resuelve el operatorId verificando la contraseña.
 * Si se proveen credenciales correctas, retorna el operatorId.
 * Si no, cae al operador por defecto (admin@erp.local).
 */
export async function resolveOperatorId(
  operatorId?: string | null,
  password?: string
): Promise<string> {
  // Si no hay credenciales, operador por defecto (mismo comportamiento actual)
  if (!operatorId || !password) {
    const existing = await prisma.operator.findUnique({
      where: { email: "admin@erp.local" },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await prisma.operator.create({
      data: {
        name: "Administrador",
        email: "admin@erp.local",
        passwordHash: await hashPassword("admin123"),
        role: "ADMIN" as const,
      },
      select: { id: true },
    });
    return created.id;
  }

  // Buscar operator por ID y verificar password
  const found = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { id: true, passwordHash: true },
  });

  if (found && (await comparePassword(password, found.passwordHash ?? ""))) {
    return found.id;
  }

  // Si no coincide, caer al default
  const existing = await prisma.operator.findUnique({
    where: { email: "admin@erp.local" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.operator.create({
    data: {
      name: "Administrador",
      email: "admin@erp.local",
      passwordHash: await hashPassword("admin123"),
      role: "ADMIN" as const,
    },
    select: { id: true },
  });
  return created.id;
}
