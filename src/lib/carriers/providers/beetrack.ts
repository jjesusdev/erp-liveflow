/**
 * Provider BEETRACK
 * Integración con Beetrack para seguimiento de flota.
 */

import { BaseCarrierProvider } from "../base";
import type { CreateShipmentContext, CreateShipmentResult } from "../types";
import type { CarrierMode } from "@prisma/client";

export class BeetrackProvider extends BaseCarrierProvider {
  readonly code = "BEETRACK" as const;
  readonly name = "Beetrack";
  readonly supportedModes: CarrierMode[] = ["EXTERNAL_OWN_FLEET", "COURIER"];
  readonly canQuote = false;
  readonly canPrintLabel = false;
  readonly canTrack = true;
  readonly canWebhook = true;
  readonly requiredConfig = ["apiKey", "organizationId"];

  async createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult> {
    this.logProviderCall("createShipment", { shipmentId: ctx.shipmentId });
    const trackingNumber = `BET-${ctx.shipmentId.slice(0, 8).toUpperCase()}`;
    const providerRef = `beetrack-${ctx.shipmentId}`;
    return {
      trackingNumber,
      providerRef,
      service: "Fleet",
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.apiKey || typeof config.apiKey !== "string" || config.apiKey.trim() === "") {
      errors.push("Configuración requerida faltante: apiKey");
    }
    if (
      !config.organizationId ||
      typeof config.organizationId !== "string" ||
      config.organizationId.trim() === ""
    ) {
      errors.push("Configuración requerida faltante: organizationId");
    }
    return { valid: errors.length === 0, errors };
  }
}

export const beetrackProvider = new BeetrackProvider();
