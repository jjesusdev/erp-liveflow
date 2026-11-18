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
