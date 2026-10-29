import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { getAvailableProviders } from "@/lib/carriers";

/**
 * Lista los proveedores de carriers disponibles en el registry.
 * La UI usa `requiredConfig` para construir el formulario de configuración.
 */
export const GET = apiHandler({
  handler: async () => {
    const items = getAvailableProviders().map((provider) => ({
      code: provider.code,
      name: provider.name,
      label: provider.name,
      supportedModes: provider.supportedModes,
      requiresConfig: provider.requiredConfig.length > 0,
      requiredConfig: provider.requiredConfig,
      canQuote: provider.canQuote,
      canPrintLabel: provider.canPrintLabel,
      canTrack: provider.canTrack,
      canWebhook: provider.canWebhook,
    }));

    return NextResponse.json({ items });
  },
});
