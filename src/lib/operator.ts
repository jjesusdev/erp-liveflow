import { prisma } from '@/lib/prisma';

const DEFAULT_OPERATOR = {
  name: 'Administrador',
  email: 'admin@erp.local',
  role: 'ADMIN' as const,
};

/**
 * Resuelve un operatorId válido. Si el id recibido no existe en la base
 * (por ejemplo un placeholder hardcodeado desde el cliente) cae al operador
 * por defecto en lugar de romper la foreign key.
 */
export async function resolveOperatorId(operatorId?: string | null) {
  if (operatorId) {
    const found = await prisma.operator.findUnique({
      where: { id: operatorId },
      select: { id: true },
    });
    if (found) return found.id;
  }

  const existing = await prisma.operator.findUnique({
    where: { email: DEFAULT_OPERATOR.email },
    select: { id: true },
  });

  if (existing) return existing.id;

  const created = await prisma.operator.create({
    data: DEFAULT_OPERATOR,
    select: { id: true },
  });

  return created.id;
}