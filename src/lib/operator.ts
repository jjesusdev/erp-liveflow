import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword } from "@/lib/auth";

/**
 * Resuelve un operatorId válido.
 * Si se proveen credenciales (operatorId + password), verifica contra la BD usando auth.ts (scrypt).
 * Si no, o si las credenciales son inválidas, cae al operador por defecto.
 */
export async function resolveOperatorId(
  operatorId?: string | null,
  password?: string
): Promise<string> {
  // Si no hay credenciales, operador por defecto (mismo comportamiento actual)
  if (!operatorId || !password) {
    const existing = await prisma.operator.findUnique({
      where: { email: "admin@erp.local" },
      select: { id: true, name: true, role: true },
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

  // Buscar operator por ID y verificar password usando auth.ts (scrypt)
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
