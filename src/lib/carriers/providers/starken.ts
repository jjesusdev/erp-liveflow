/**
 * Provider STARKEN
 * Integración con el carrier Starken para envíos tipo COURIER.
 */

import { BaseCarrierProvider } from "../base";
import type { CreateShipmentContext, CreateShipmentResult } from "../types";
import type { CarrierMode } from "@prisma/client";

export class StarkenProvider extends BaseCarrierProvider {
  readonly code = "STARKEN" as const;
  readonly name = "Starken";
  readonly supportedModes: CarrierMode[] = ["COURIER"];
  readonly canQuote = false;
  readonly canPrintLabel = true;
  readonly canTrack = true;
  readonly canWebhook = false;
  readonly requiredConfig = ["apiKey"];

  async createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult> {
    this.logProviderCall("createShipment", { shipmentId: ctx.shipmentId });
    const trackingNumber = `STK-${ctx.shipmentId.slice(0, 8).toUpperCase()}`;
    const providerRef = `starken-${ctx.shipmentId}`;
    return {
      trackingNumber,
      providerRef,
      service: "Estandar",
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.apiKey || typeof config.apiKey !== "string" || config.apiKey.trim() === "") {
      errors.push("Configuración requerida faltante: apiKey");
    }
    return { valid: errors.length === 0, errors };
  }
}

export const starkenProvider = new StarkenProvider();
