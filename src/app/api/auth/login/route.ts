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

// Credenciales demo
const DEMO_CREDENTIALS = {
  admin: { email: "admin@erp.local", password: "admin123", role: "ADMIN" as const },
};

/** POST /api/auth/login - Login con inicialización automática */
export const POST = apiHandler<LoginBody>({
  body: z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(4, "Contraseña mínima 4 caracteres"),
  }),
  handler: async (req, parsedBody) => {
    console.log("[login] Iniciando proceso de login");
    const { email, password } = parsedBody;
    const email_normalized = email.toLowerCase().trim();

    // Verificar si es credencial demo
    const isDemo = email_normalized === "admin@erp.local" && password === "admin123";

    // Buscar operador
    let operator = await prisma.operator.findUnique({
      where: { email: email_normalized },
      include: { organization: true },
    });

    let passwordValid = false;

    // Verificar password si el operador existe
    if (operator?.passwordHash && operator.passwordHash.length >= 48) {
      try {
        passwordValid = await comparePassword(password, operator.passwordHash);
      } catch (e) {
        console.log("[login] Error comparando password:", e);
      }
    }

    console.log("[login] passwordValid:", passwordValid, "isDemo:", isDemo);

    // Si falla y es demo, crear/usar sistema demo
    if (!passwordValid && isDemo) {
      console.log("[login] Intenando inicializar sistema demo...");

      try {
        // Crear organización demo
        const org = await prisma.organization.upsert({
          where: { slug: "demo" },
          update: {
            name: "Demo LiveFlow",
            isActive: true,
            settings: {},
          },
          create: {
            name: "Demo LiveFlow",
            slug: "demo",
            isActive: true,
            settings: {},
          },
        });

        // Crear password hash demo
        const passwordHash = await hashPassword("admin123");

        // Crear/usar operador demo
        operator = await prisma.operator.upsert({
          where: { email: email_normalized },
          update: {
            name: "Administrador",
            role: "ADMIN",
            orgId: org.id,
            passwordHash: passwordHash,
            isOnline: true,
          },
          create: {
            name: "Administrador",
            email: email_normalized,
            role: "ADMIN",
            orgId: org.id,
            passwordHash: passwordHash,
            isOnline: true,
          },
          include: { organization: true },
        });

        passwordValid = true;
        console.log("[login] Usuario demo creado/verificado:", operator.id);
      } catch (initError: any) {
        console.error("[login] Error creando usuario demo:", initError.message);
        return NextResponse.json(
          { error: `Error de inicialización: ${initError.message}` },
          { status: 500 }
        );
      }
    }

    // Si sigue sin estar válido
    if (!operator || !passwordValid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // Asegurar orgId
    const orgId = operator.organization?.id;
    if (!orgId) {
      await prisma.operator.update({
        where: { id: operator.id },
        data: { orgId: operator.organization?.id || "demo-org" },
      });
    }

    await createSession(operator.id, operator.role, orgId!);

    console.log("[login] Login exitoso para:", operator.name);

    return NextResponse.json({
      operatorId: operator.id,
      name: operator.name,
      role: operator.role,
    });
  },
});
