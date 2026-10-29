import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { getCarrierProvider } from "@/lib/carriers";

/**
 * Valida la configuración guardada de un carrier.
 *
 * Nota: hoy los providers son simulados, así que esto valida la config
 * (campos requeridos) pero no abre una conexión real contra el carrier.
 */
export const POST = apiHandler({
  handler: async (_req, _body, context) => {
    const { id } = await context.params;

    const carrier = await prisma.carrier.findUnique({ where: { id } });
    if (!carrier) {
      return NextResponse.json({ error: "Carrier no encontrado" }, { status: 404 });
    }

    const provider = getCarrierProvider(carrier.apiProvider);
    if (!provider) {
      return NextResponse.json(
        { error: `Proveedor no registrado: ${carrier.apiProvider}` },
        { status: 400 }
      );
    }

    const config = (carrier.config as Record<string, unknown> | null) ?? {};
    const validation = provider.validateConfig?.(config) ?? { valid: true, errors: [] };

    return NextResponse.json({
      ok: validation.valid,
      provider: carrier.apiProvider,
      errors: validation.errors,
    });
  },
});
