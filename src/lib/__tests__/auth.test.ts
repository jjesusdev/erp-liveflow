import { describe, it, expect, beforeEach } from "vitest";
import { hashPassword, comparePassword } from "@/lib/auth";

describe("auth.ts hashPassword", () => {
  it("should generate a valid scrypt hash", async () => {
    const hash = await hashPassword("testpassword123");
    expect(typeof hash).toBe("string");
    // Base64 pattern validation
    expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/);
    // Debe tener al menos 48 chars (16 salt + 32 key en base64)
    expect(hash.length).toBeGreaterThanOrEqual(48);
  });

  it("should produce different hashes for same password", async () => {
    const hash1 = await hashPassword("secret");
    const hash2 = await hashPassword("secret");
    expect(hash1).not.toBe(hash2); // diferente salt cada vez
  });

  it("should produce hash with different passwords", async () => {
    const hash1 = await hashPassword("password1");
    const hash2 = await hashPassword("password2");
    expect(hash1).not.toBe(hash2);
  });
});

describe("auth.ts comparePassword", () => {
  let hash: string;

  beforeEach(async () => {
    // Crear un hash fresco antes de cada test
    hash = await hashPassword("admin123");
  });

  it("should return true for correct password", async () => {
    const result = await comparePassword("admin123", hash);
    expect(result).toBe(true);
  });

  it("should return false for wrong password", async () => {
    const result = await comparePassword("wrongpassword", hash);
    expect(result).toBe(false);
  });

  it("should return false for empty password", async () => {
    const result = await comparePassword("", hash);
    expect(result).toBe(false);
  });

  it("should return false for very short password", async () => {
    const result = await comparePassword("ab", hash);
    expect(result).toBe(false);
  });
});
