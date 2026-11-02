import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { comparePassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { NextResponse } from "next/server";

type LoginBody = {
  email: string;
  password: string;
};

/** POST /api/auth/login - Iniciar sesión de operador */
export const POST = apiHandler<LoginBody>({
  body: z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(4, "Contraseña mínima 4 caracteres"),
  }),
  handler: async (req, parsedBody) => {
    const { email, password } = parsedBody;

    // Buscar operador por email, cargando su organización para obtener el orgId
    const operator = await prisma.operator.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!operator || !(await comparePassword(password, operator.passwordHash ?? ""))) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const orgId = operator.organization?.id;
    if (!orgId) {
      return NextResponse.json(
        { error: "El operador no pertenece a ninguna organización" },
        { status: 400 }
      );
    }

    // Establecer cookie de sesión firmada con operatorId, role y orgId
    await createSession(operator.id, operator.role, orgId);

    return NextResponse.json({
      operatorId: operator.id,
      name: operator.name,
      role: operator.role,
    });
  },
});
