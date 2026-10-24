/**
 * Provider MANUAL - Implementación base para envíos sin API externa.
 * Permite ingresar tracking number manualmente y gestiona el ciclo de vida local.
 */

import type {
  CarrierProvider,
  CreateShipmentContext,
  CreateShipmentResult,
  TrackingEvent,
} from "./types";
import type { CarrierApiProvider, CarrierMode, ShipmentMode } from "@prisma/client";

/**
 * Mapea ShipmentMode a CarrierMode para validación
 */
function toCarrierMode(mode: ShipmentMode): CarrierMode {
  switch (mode) {
    case "OWN_FLEET":
      return "EXTERNAL_OWN_FLEET";
    case "PICKUP":
      return "STORE_PICKUP";
    case "COURIER":
    default:
      return "COURIER";
  }
}

/**
 * Provider MANUAL - No requiere API externa, todo se gestiona manualmente
 * Útil para: flota propia, retiro en tienda, courier sin API, testing
 */
export class ManualProvider implements CarrierProvider {
  readonly code: CarrierApiProvider = "MANUAL";
  readonly name = "Manual / Sin API";
  // Usar CarrierMode (valores del modelo Carrier)
  readonly supportedModes: CarrierMode[] = ["COURIER", "EXTERNAL_OWN_FLEET", "STORE_PICKUP"];
  readonly canQuote = false;
  readonly canPrintLabel = false;
  readonly canTrack = false;
  readonly canWebhook = false;
  readonly requiredConfig: string[] = [];

  /**
   * Crea un envío manual - solo registra el tracking number si se provee
   * No llama a ninguna API externa
   */
  async createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult> {
    // Generar tracking number si no se proveyó
    const trackingNumber =
      ctx.trackingNumber ??
      `MAN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Para MANUAL, la labelUrl y trackingUrl son opcionales
    // El usuario puede subirlos manualmente después
    return {
      trackingNumber,
      labelUrl: undefined,
      trackingUrl: undefined,
      providerRef: `manual-${ctx.shipmentId}`,
      service: "Manual",
      costClp: undefined,
      rawResponse: {
        mode: ctx.mode,
        carrierMode: toCarrierMode(ctx.mode),
        note: "Envío creado manualmente - sin integración API",
      },
    };
  }

  /**
   * Tracking manual - no hay API para consultar
   * Retorna array vacío (el tracking se actualiza manualmente en la UI)
   */
  async track(
    _providerRef: string,
    _carrierConfig: Record<string, unknown>
  ): Promise<TrackingEvent[]> {
    return [];
  }

  /**
   * Validar config - MANUAL no requiere configuración
   */
  validateConfig(_config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }
}

/**
 * Instancia singleton del provider MANUAL
 */
export const manualProvider = new ManualProvider();
