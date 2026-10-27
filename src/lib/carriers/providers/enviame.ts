/**
 * Provider ENVIAME
 * Integración con el carrier Enviame para envíos tipo COURIER.
 * Soporta impresión de etiqueta y tracking, sin cotización ni webhooks.
 */

import { BaseCarrierProvider } from "../base";
import type { CreateShipmentContext, CreateShipmentResult } from "../types";
import type { CarrierMode } from "@prisma/client";

/**
 * Proveedor Enviame para envíos courier.
 *
 * - code: ENVIAME
 * - supportedModes: [COURIER]
 * - canQuote: false
 * - canPrintLabel: true
 * - canTrack: true
 * - canWebhook: false
 * - requiredConfig: ['apiKey']
 */
export class EnviameProvider extends BaseCarrierProvider {
  /** Código único del proveedor */
  readonly code = "ENVIAME" as const;

  /** Nombre legible */
  readonly name = "Enviame";

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
  readonly requiredConfig = ["apiKey"];

  /**
   * Crea un envío en Enviame.
   * Implementación de ejemplo: genera tracking y referencia basados en shipmentId.
   *
   * @param ctx Contexto de creación del envío
   * @returns Resultado con trackingNumber y providerRef
   */
  async createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult> {
    this.logProviderCall("createShipment", { shipmentId: ctx.shipmentId });

    // TODO: Reemplazar por llamada real a API de Enviame
    const trackingNumber = `ENV-${ctx.shipmentId}`;
    const providerRef = `enviame-${ctx.shipmentId}`;

    return {
      trackingNumber,
      providerRef,
    };
  }

  /**
   * Valida que la configuración contenga apiKey.
   *
   * @param config Configuración del carrier
   * @returns Resultado de validación
   */
  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    if (!config.apiKey || typeof config.apiKey !== "string" || config.apiKey.trim() === "") {
      return { valid: false, errors: ["Configuración requerida faltante: apiKey"] };
    }
    return { valid: true, errors: [] };
  }
}

/**
 * Instancia singleton del provider Enviame
 */
export const enviameProvider = new EnviameProvider();
