/**
 * Provider SHIPIT
 * Integración con el carrier Shipit para envíos tipo COURIER.
 * Soporta impresión de etiqueta y tracking, sin cotización ni webhooks.
 */

/**
 * Proveedor Shipit para envíos courier.
 *
 * - code: SHIPIT
 * - supportedModes: [COURIER]
 * - canQuote: false
 * - canPrintLabel: true
 * - canTrack: true
 * - canWebhook: false
 * - requiredConfig: ['apiKey','apiSecret']
 */

import { BaseCarrierProvider } from "../base";
import type { CreateShipmentContext, CreateShipmentResult } from "../types";
import type { CarrierMode } from "@prisma/client";

export class ShipitProvider extends BaseCarrierProvider {
  /** Código único del proveedor */
  readonly code = "SHIPIT" as const;

  /** Nombre legible */
  readonly name = "Shipit";

  /** Modos soportados */
  readonly supportedModes: CarrierMode[] = ["COURIER"];

  /** Cotización automática */
  readonly canQuote = false;

  /** Impresión de etiqueta */
  readonly canPrintLabel = true;

  /** Tracking automático */
  readonly canTrack = true;

  /** Webhooks */
  readonly canWebhook = false;

  /** Configuración requerida */
  readonly requiredConfig = ["apiKey", "apiSecret"];

  /**
   * Crea un envío en Shipit.
   * Implementación de ejemplo: genera tracking y referencia basados en shipmentId.
   *
   * @param ctx Contexto de creación del envío
   * @returns Resultado con trackingNumber, providerRef y servicio
   */
  async createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult> {
    this.logProviderCall("createShipment", { shipmentId: ctx.shipmentId });

    // TODO: Reemplazar por llamada real a API de Shipit
    const trackingNumber = `SHIP-${ctx.shipmentId}`;
    const providerRef = `shipit-${ctx.shipmentId}`;

    return {
      trackingNumber,
      providerRef,
      service: "Standard",
    };
  }

  /**
   * Valida que la configuración contenga apiKey y apiSecret.
   *
   * @param config Configuración del carrier
   * @returns Resultado de validación
   */
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

/**
 * Instancia singleton del provider Shipit
 */
export const shipitProvider = new ShipitProvider();
