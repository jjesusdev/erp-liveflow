import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { resolveOperatorId } from "@/lib/operator";
import { comparePassword, hashPassword } from "@/lib/auth";
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

    // Buscar operador por email
    const operator = await prisma.operator.findUnique({
      where: { email },
      select: { id: true, name: true, role: true, passwordHash: true },
    });

    if (!operator || !(await comparePassword(password, operator.passwordHash ?? ""))) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // Return operator info (en un sistema real, aquí iría un token JWT o sesión)
    return NextResponse.json({
      operatorId: operator.id,
      name: operator.name,
      role: operator.role,
    });
  },
});
