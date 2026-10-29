/**
 * Provider SIMPLIROUTE
 * Integración con SimpliRoute para flota propia / última milla.
 */

import { BaseCarrierProvider } from "../base";
import type { CreateShipmentContext, CreateShipmentResult } from "../types";
import type { CarrierMode } from "@prisma/client";

export class SimpliRouteProvider extends BaseCarrierProvider {
  readonly code = "SIMPLIROUTE" as const;
  readonly name = "SimpliRoute";
  readonly supportedModes: CarrierMode[] = ["EXTERNAL_OWN_FLEET", "COURIER"];
  readonly canQuote = false;
  readonly canPrintLabel = false;
  readonly canTrack = true;
  readonly canWebhook = true;
  readonly requiredConfig = ["apiKey", "accountId"];

  async createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult> {
    this.logProviderCall("createShipment", { shipmentId: ctx.shipmentId });
    const trackingNumber = `SIM-${ctx.shipmentId.slice(0, 8).toUpperCase()}`;
    const providerRef = `simpliroute-${ctx.shipmentId}`;
    return {
      trackingNumber,
      providerRef,
      service: "Own Fleet",
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.apiKey || typeof config.apiKey !== "string" || config.apiKey.trim() === "") {
      errors.push("Configuración requerida faltante: apiKey");
    }
    if (
      !config.accountId ||
      typeof config.accountId !== "string" ||
      config.accountId.trim() === ""
    ) {
      errors.push("Configuración requerida faltante: accountId");
    }
    return { valid: errors.length === 0, errors };
  }
}

export const simplirouteProvider = new SimpliRouteProvider();
