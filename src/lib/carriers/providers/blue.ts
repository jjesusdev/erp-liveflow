/**
 * Provider BLUE EXPRESS
 * Integración con el carrier Blue Express para envíos tipo COURIER.
 * Soporta impresión de etiqueta y tracking, sin cotización ni webhooks.
 */

import { BaseCarrierProvider } from "../base";
import type { CreateShipmentContext, CreateShipmentResult } from "../types";
import type { CarrierMode } from "@prisma/client";

export class BlueProvider extends BaseCarrierProvider {
  readonly code = "BLUE" as const;
  readonly name = "Blue Express";
  readonly supportedModes: CarrierMode[] = ["COURIER"];
  readonly canQuote = false;
  readonly canPrintLabel = true;
  readonly canTrack = true;
  readonly canWebhook = false;
  readonly requiredConfig = ["apiKey", "apiSecret"];

  async createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult> {
    this.logProviderCall("createShipment", { shipmentId: ctx.shipmentId });
    const trackingNumber = `BLUE-${ctx.shipmentId.slice(0, 8).toUpperCase()}`;
    const providerRef = `blue-${ctx.shipmentId}`;
    return {
      trackingNumber,
      providerRef,
      service: "Standard",
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.apiKey || typeof config.apiKey !== "string" || config.apiKey.trim() === "") {
      errors.push("Configuración requerida faltante: apiKey");
    }
    if (
      !config.apiSecret ||
      typeof config.apiSecret !== "string" ||
      config.apiSecret.trim() === ""
    ) {
      errors.push("Configuración requerida faltante: apiSecret");
    }
    return { valid: errors.length === 0, errors };
  }
}

export const blueProvider = new BlueProvider();
