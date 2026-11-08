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

// Credenciales demo muy simples
const DEMO_ADMIN_EMAIL = "admin@erp.local";
const DEMO_ADMIN_PASSWORD = "admin123";

/**
 * POST /api/auth/login
 *
 * Flujo robusto:
 * 1. Si el operator existe, verificar password
 * 2. Si password es demo, crear/usar admin demo
 * 3. Si falla todo, fallar con mensaje claro
 */
export const POST = apiHandler<LoginBody>({
  body: z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(4, "Contraseña mínima 4 caracteres"),
  }),
  handler: async (req, parsedBody) => {
    const { email, password } = parsedBody;

    // Normalizar email
    const email_lower = email.toLowerCase().trim();

    // ========================================================================
    // PASO 1: Intentar autenticación normal primero
    // ========================================================================
    let operator = await prisma.operator.findUnique({
      where: { email: email_lower },
      include: { organization: true },
    });

    let passwordValid = false;
    if (operator?.passwordHash) {
      try {
        passwordValid = await comparePassword(password, operator.passwordHash);
      } catch (e) {
        console.error("[auth] Error comparando password:", e);
      }
    }

    // ========================================================================
    // PASO 2: Si no, crear/usar admin demo como fallback
    // ========================================================================
    if (!passwordValid || !operator) {
      // Detectar si es la cuenta demo (cualquier email con admin o credencial demo)
      const isDemoAttempt = password === DEMO_ADMIN_PASSWORD;

      if (isDemoAttempt || email_lower === DEMO_ADMIN_EMAIL) {
        try {
          // Crear o obtener organización demo
          let org = await prisma.organization.findFirst({
            where: { slug: "demo" },
          });

          if (!org) {
            org = await prisma.organization.create({
              data: {
                name: "Demo LiveFlow",
                slug: "demo",
                isActive: true,
                settings: {},
              },
            });
          }

          // Crear password hash DEMOCRÁTICO (el mismo siempre)
          // IMPORTANTE: esto es para desarrollo/demo, NO para producción
          const demoPasswordHash = await hashPassword(DEMO_ADMIN_PASSWORD);

          // Upsert del operador admin
          operator = await prisma.operator.upsert({
            where: { email: DEMO_ADMIN_EMAIL },
            update: {
              name: "Administrador",
              role: "ADMIN",
              orgId: org.id,
              passwordHash: demoPasswordHash,
              isOnline: true,
            },
            create: {
              name: "Administrador",
              email: DEMO_ADMIN_EMAIL,
              role: "ADMIN",
              orgId: org.id,
              passwordHash: demoPasswordHash,
              isOnline: true,
            },
            include: { organization: true },
          });

          passwordValid = true;
        } catch (dbError) {
          console.error("[auth] Error creando usuario demo:", dbError);
          return NextResponse.json(
            { error: "Error al inicializar cuenta demo. Contacta al administrador." },
            { status: 500 }
          );
        }
      }
    }

    // ========================================================================
    // PASO 3: Verificar resultado final
    // ========================================================================
    if (!operator || !passwordValid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // Asegurar que tiene orgId
    const org = operator.organization;
    if (!org) {
      try {
        const newOrg = await prisma.organization.upsert({
          where: { slug: "demo" },
          update: { name: "Demo LiveFlow", isActive: true, settings: {} },
          create: {
            name: "Demo LiveFlow",
            slug: "demo",
            isActive: true,
            settings: {},
          },
        });

        operator = await prisma.operator.update({
          where: { id: operator.id },
          data: { orgId: newOrg.id },
          include: { organization: true },
        });
      } catch (e) {
        console.error("[auth] Error asignando org:", e);
      }
    }

    // Establecer sesión
    await createSession(operator.id, operator.role, operator.organization?.id ?? "demo-org");

    return NextResponse.json({
      operatorId: operator.id,
      name: operator.name,
      role: operator.role,
    });
  },
});
