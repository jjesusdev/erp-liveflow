import { getAvailableProviders } from "@/lib/carriers";

type AvailableProvider = ReturnType<typeof getAvailableProviders>[number];

function baseProviderMeta(provider: AvailableProvider) {
  return {
    code: provider.code,
    name: provider.name,
    label: provider.name,
    supportedModes: provider.supportedModes,
    requiresConfig: provider.requiredConfig.length > 0,
    requiredConfig: provider.requiredConfig,
    canQuote: provider.canQuote,
    canWebhook: provider.canWebhook,
    canTrack: provider.canTrack,
    canPrintLabel: provider.canPrintLabel,
  };
}

/** Metadata expuesta por `GET /api/carriers?meta=1`. */
export function providerMeta() {
  return getAvailableProviders().map((provider) => {
    const meta = baseProviderMeta(provider);
    return {
      code: meta.code,
      label: meta.label,
      requiresConfig: meta.requiresConfig,
      requiredConfig: meta.requiredConfig,
      supportsTracking: meta.canTrack,
      supportsLabel: meta.canPrintLabel,
      supportedModes: meta.supportedModes,
      canQuote: meta.canQuote,
      canWebhook: meta.canWebhook,
    };
  });
}

/** Metadata expuesta por `GET /api/carriers/providers`. */
export function availableProvidersMeta() {
  return getAvailableProviders().map((provider) => {
    const meta = baseProviderMeta(provider);
    return {
      code: meta.code,
      name: meta.name,
      label: meta.label,
      supportedModes: meta.supportedModes,
      requiresConfig: meta.requiresConfig,
      requiredConfig: meta.requiredConfig,
      canQuote: meta.canQuote,
      canPrintLabel: meta.canPrintLabel,
      canTrack: meta.canTrack,
      canWebhook: meta.canWebhook,
    };
  });
}
