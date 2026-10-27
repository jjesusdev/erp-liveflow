/**
 * Provider CHILEXPRESS
 * Integración con el carrier Chilexpress para envíos tipo COURIER.
 * Soporta impresión de etiqueta y tracking, sin cotización ni webhooks.
 */

/**
 * Proveedor Chilexpress para envíos courier.
 *
 * - code: CHILEXPRESS
 * - supportedModes: [COURIER]
 * - canQuote: false
 * - canPrintLabel: true
 * - canTrack: true
 * - canWebhook: false
 * - requiredConfig: ['clientId','clientSecret','subdomain']
 */

import { BaseCarrierProvider } from "../base";
import type { CreateShipmentContext, CreateShipmentResult } from "../types";
import type { CarrierMode } from "@prisma/client";
import { fetchWithRetry } from "../utils/http";

export class ChilexpressProvider extends BaseCarrierProvider {
  /** Código único del proveedor */
  readonly code = "CHILEXPRESS" as const;

  /** Nombre legible */
  readonly name = "Chilexpress";

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
  readonly requiredConfig = ["clientId", "clientSecret", "subdomain"];

  /**
   * Crea un envío en Chilexpress.
   * Implementación simulada: genera tracking y referencia basados en shipmentId.
   *
   * @param ctx Contexto de creación del envío
   * @returns Resultado con trackingNumber, providerRef y servicio
   */
  async createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult> {
    this.logProviderCall("createShipment", { shipmentId: ctx.shipmentId });

    // Simula uso de configuración
    const { clientId, clientSecret, subdomain } = ctx.carrierConfig as {
      clientId?: unknown;
      clientSecret?: unknown;
      subdomain?: unknown;
    };

    // TODO: Reemplazar por llamada real a API de Chilexpress usando fetchWithRetry
    // const url = `https://${subdomain}.chilexpress.com/api/...`;
    // await fetchWithRetry(url, { ... });

    const trackingNumber = `CHX-${ctx.shipmentId.slice(0, 8).toUpperCase()}`;
    const providerRef = `chilexpress-${ctx.shipmentId}`;

    return {
      trackingNumber,
      providerRef,
      service: "Normal",
    };
  }

  /**
   * Valida que la configuración contenga clientId, clientSecret y subdomain.
   *
   * @param config Configuración del carrier
   * @returns Resultado de validación
   */
  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.clientId || typeof config.clientId !== "string" || config.clientId.trim() === "") {
      errors.push("Configuración requerida faltante: clientId");
    }

    if (
      !config.clientSecret ||
      typeof config.clientSecret !== "string" ||
      config.clientSecret.trim() === ""
    ) {
      errors.push("Configuración requerida faltante: clientSecret");
    }

    if (
      !config.subdomain ||
      typeof config.subdomain !== "string" ||
      config.subdomain.trim() === ""
    ) {
      errors.push("Configuración requerida faltante: subdomain");
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Instancia singleton del provider Chilexpress
 */
export const chilexpressProvider = new ChilexpressProvider();
