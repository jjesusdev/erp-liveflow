import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { hashPassword, comparePassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { NextResponse } from "next/server";

type LoginBody = {
  email: string;
  password: string;
};

const DEMO_EMAILS = {
  admin: "admin@erp.local",
  vendedora: "vendedora@erp.local",
};

const DEMO_PASSWORDS = {
  admin: "admin123",
  vendedora: "vendedora123",
};

/** POST /api/auth/login - Iniciar sesión de operador */
export const POST = apiHandler<LoginBody>({
  body: z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(4, "Contraseña mínima 4 caracteres"),
  }),
  handler: async (req, parsedBody) => {
    const { email, password } = parsedBody;

    // Normalizar email (mayúsculas/minúsculas)
    const normalizedEmail = email.toLowerCase().trim();

    // Buscar operador por email
    let operator = await prisma.operator.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true },
    });

    // Si no existe operador, o la contraseña no coincide, intentar con fallback demo
    let isValid = false;
    if (operator && operator.passwordHash) {
      isValid = await comparePassword(password, operator.passwordHash);
    }

    if (!isValid) {
      // Intentar login con credenciales demo
      const demoCredentials = Object.entries(DEMO_PASSWORDS).find(([, pass]) => pass === password);

      if (demoCredentials && normalizedEmail === DEMO_EMAILS.admin) {
        // Buscar o crear admin demo
        operator = await prisma.operator.findUnique({
          where: { email: DEMO_EMAILS.admin },
          include: { organization: true },
        });

        if (!operator) {
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

          // Crear admin demo
          const passwordHash = await hashPassword(DEMO_PASSWORDS.admin);
          operator = await prisma.operator.create({
            data: {
              name: "Administrador",
              email: DEMO_EMAILS.admin,
              role: "ADMIN",
              orgId: org.id,
              passwordHash,
            },
            include: { organization: true },
          });
          isValid = true;
        } else if (operator.organization) {
          isValid = true;
        }
      }
    }

    if (!isValid || !operator) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // Si no tiene organización, asignar demo
    const org =
      operator.organization ??
      (await prisma.organization.upsert({
        where: { slug: "demo" },
        update: { name: "Demo LiveFlow", isActive: true, settings: {} },
        create: {
          name: "Demo LiveFlow",
          slug: "demo",
          isActive: true,
          settings: {},
        },
      }));

    const orgId = org.id;

    // Actualizar operador con orgId si no lo tenía
    if (!operator.organization) {
      operator = await prisma.operator.update({
        where: { id: operator.id },
        data: { orgId },
        include: { organization: true },
      });
    }

    // Establecer cookie de sesión
    await createSession(operator.id, operator.role, orgId);

    return NextResponse.json({
      operatorId: operator.id,
      name: operator.name,
      role: operator.role,
    });
  },
});
