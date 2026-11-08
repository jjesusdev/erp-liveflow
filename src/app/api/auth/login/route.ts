import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { comparePassword, hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { NextResponse } from "next/server";

type LoginBody = {
  email: string;
  password: string;
};

/**
 * POST /api/auth/login - Iniciar sesión de operador
 *
 * Usa credenciales demo para entornos de desarrollo.
 * Credenciales por defecto (si no existen usuarios):
 * - admin@erp.local / admin123 (ADMIN)
 * - vendedora@erp.local / vendedora123 (AGENT)
 */
export const POST = apiHandler<LoginBody>({
  body: z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(4, "Contraseña mínima 4 caracteres"),
  }),
  handler: async (req, parsedBody) => {
    const { email, password } = parsedBody;

    // Buscar operador por email, cargando su organización para obtener el orgId
    let operator = await prisma.operator.findUnique({
      where: { email },
      include: { organization: true },
    });

    // Si no existe o la contraseña no coincide, intentar con fallback demo
    if (!operator || !(await comparePassword(password, operator.passwordHash ?? ""))) {
      // Intentar con credenciales demo admin@erp.local / admin123
      const demoAdmin = await prisma.operator.findUnique({
        where: { email: "admin@erp.local" },
        include: { organization: true },
      });

      if (demoAdmin && (await comparePassword(password, demoAdmin.passwordHash ?? ""))) {
        operator = demoAdmin;
      } else {
        // Si ni siquiera el admin demo existe, crear usuarios demo
        // Esto permite que funcione inmediatamente en nuevos despliegues
        return await createDemoUsersAndLogin(req);
      }
    }

    const orgId = operator.organization?.id;
    if (!orgId) {
      // Si el operador no tiene organización, crear una org por defecto
      const org = await prisma.organization.upsert({
        where: { slug: "demo" },
        update: { name: "Demo LiveFlow", isActive: true, settings: {} },
        create: {
          name: "Demo LiveFlow",
          slug: "demo",
          isActive: true,
          settings: {},
        },
      });

      // Actualizar el operador con el orgId
      operator = await prisma.operator.update({
        where: { id: operator.id },
        data: { orgId: org.id },
        include: { organization: true },
      });
    }

    // Establecer cookie de sesión firmada con operatorId, role y orgId
    await createSession(operator.id, operator.role, orgId!);

    return NextResponse.json({
      operatorId: operator.id,
      name: operator.name,
      role: operator.role,
    });
  },
});

/**
 * Crea usuarios demo si no existen y devuelve el login automático
 */
async function createDemoUsersAndLogin(req: Request): Promise<NextResponse> {
  // Crear organización demo
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: { name: "Demo LiveFlow", isActive: true, settings: {} },
    create: {
      name: "Demo LiveFlow",
      slug: "demo",
      isActive: true,
      settings: {},
    },
  });

  // Crear admin demo con contraseña hasheada
  const adminPasswordHash = await hashPassword("admin123");
  const admin = await prisma.operator.upsert({
    where: { email: "admin@erp.local" },
    update: {
      name: "Administrador",
      role: "ADMIN",
      orgId: org.id,
      passwordHash: adminPasswordHash,
    },
    create: {
      name: "Administrador",
      email: "admin@erp.local",
      role: "ADMIN",
      orgId: org.id,
      passwordHash: adminPasswordHash,
    },
  });

  // Establecer cookie de sesión
  await createSession(admin.id, admin.role, org.id);

  return NextResponse.json({
    operatorId: admin.id,
    name: admin.name,
    role: admin.role,
  });
}
