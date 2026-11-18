import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { availableProvidersMeta } from "@/lib/carriers/metadata";

/**
 * Lista los proveedores de carriers disponibles en el registry.
 * La UI usa `requiredConfig` para construir el formulario de configuración.
 */
export const GET = apiHandler({
  handler: async () => {
    return NextResponse.json({ items: availableProvidersMeta() });
  },
});
