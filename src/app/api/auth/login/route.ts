import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { comparePassword, hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { createRateLimiter } from "@/lib/rate-limit";
import { ensureDemoOrg } from "@/lib/demo/ensure-org";
import { NextResponse } from "next/server";

type LoginBody = {
  email: string;
  password: string;
};

const loginLimiter = createRateLimiter({ max: 10, windowMs: 60_000 });
const demoLoginEnabled =
  process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_LOGIN === "true";

/** POST /api/auth/login */
export const POST = apiHandler<LoginBody>({
  body: z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(4, "Contraseña mínima 4 caracteres"),
  }),
  handler: async (req, parsedBody) => {
    const limited = loginLimiter(req);
    if (limited) return limited;

    const { email, password } = parsedBody;
    const email_normalized = email.toLowerCase().trim();

    // Verificar si es credencial demo
    const isDemo =
      demoLoginEnabled && email_normalized === "admin@erp.local" && password === "admin123";

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

    // Asegurar orgId con un ID real (nunca un slug hardcodeado).
    let orgId = operator.orgId;
    if (!orgId) {
      if (!demoLoginEnabled) {
        return NextResponse.json(
          { error: "El operador no tiene una organización asignada" },
          { status: 500 }
        );
      }
      orgId = await ensureDemoOrg();
      await prisma.operator.update({ where: { id: operator.id }, data: { orgId } });
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
