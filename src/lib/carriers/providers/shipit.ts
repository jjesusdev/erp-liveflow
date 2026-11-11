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
import type { CreateShipmentContext, CreateShipmentResult, TrackingEvent } from "../types";
import type { CarrierMode, ShipmentStatus } from "@prisma/client";
import { fetchWithRetry } from "../utils/http";
import { parseProviderError } from "../utils/http";

const SHIPIT_BASE_URL = process.env.SHIPIT_API_URL || "https://api.shipit.cl";

export class ShipitProvider extends BaseCarrierProvider {
  readonly code = "SHIPIT" as const;
  readonly name = "Shipit";
  readonly supportedModes: CarrierMode[] = ["COURIER"];
  readonly canQuote = false;
  readonly canPrintLabel = true;
  readonly canTrack = true;
  readonly canWebhook = false;
  readonly requiredConfig = ["apiKey", "apiSecret"];

  async createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult> {
    this.logProviderCall("createShipment", { shipmentId: ctx.shipmentId });

    const { apiKey, apiSecret } = ctx.carrierConfig as {
      apiKey?: unknown;
      apiSecret?: unknown;
    };

    // Si faltan credenciales, usar fallback simulado (no romper el flujo)
    if (!apiKey || !apiSecret) {
      this.logProviderCall("createShipment:fallback", { reason: "missing credentials" });
      return this.fallbackShipment(ctx.shipmentId, "Standard");
    }

    try {
      const response = await fetchWithRetry(`${SHIPIT_BASE_URL}/api/v1/shipping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": String(apiKey),
        },
        body: JSON.stringify({
          reference: ctx.shipmentId,
          recipient_name: ctx.recipient.name,
          recipient_phone: ctx.recipient.phone,
          recipient_email: ctx.recipient.email,
          address_street: ctx.address.street,
          address_number: ctx.address.number,
          address_city: ctx.address.city,
          address_state: ctx.address.state,
          address_zip: ctx.address.zipCode,
          weight_grams: ctx.weightGrams,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const parsed = parseProviderError(body || `HTTP ${response.status}`);
        throw new Error(parsed.message);
      }

      const data = await response.json();
      return {
        trackingNumber: data.tracking_number || `SHIP-${ctx.shipmentId}`,
        providerRef: data.id || `shipit-${ctx.shipmentId}`,
        service: data.service || "Standard",
        labelUrl: data.label_url,
        trackingUrl: data.tracking_url,
        costClp: data.cost_clp,
        rawResponse: data,
      };
    } catch (error) {
      const parsed = parseProviderError(error);
      console.error(`[Carrier:SHIPIT] Error creando envío:`, parsed.message);
      return this.fallbackShipment(ctx.shipmentId, "Standard");
    }
  }

  async track(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<TrackingEvent[]> {
    const { apiKey } = carrierConfig as { apiKey?: unknown };

    if (!apiKey) {
      return [];
    }

    try {
      const response = await fetchWithRetry(
        `${SHIPIT_BASE_URL}/api/v1/shipping/${encodeURIComponent(providerRef)}/tracking`,
        {
          method: "GET",
          headers: {
            "Access-Token": String(apiKey),
          },
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const events = (data.events || []).map((e: any) => ({
        status: this.mapShipitStatus(e.status) as ShipmentStatus,
        occurredAt: new Date(e.occurred_at || e.date || new Date().toISOString()),
        description: e.description || e.status,
        location: e.location,
        rawData: e,
      }));
      return events;
    } catch (error) {
      const parsed = parseProviderError(error);
      console.error(`[Carrier:SHIPIT] Error obteniendo tracking:`, parsed.message);
      return [];
    }
  }

  async printLabel(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<{ labelUrl: string }> {
    const { apiKey } = carrierConfig as { apiKey?: unknown };
    if (!apiKey) {
      throw new Error("Faltan credenciales de Shipit para imprimir etiqueta");
    }
    return {
      labelUrl: `${SHIPIT_BASE_URL}/api/v1/shipping/${encodeURIComponent(providerRef)}/label`,
    };
  }

  private mapShipitStatus(status: string): ShipmentStatus {
    const map: Record<string, ShipmentStatus> = {
      pending: "PENDING",
      ready: "READY",
      label_printed: "LABEL_PRINTED",
      picked_up: "PICKED_UP",
      in_transit: "IN_TRANSIT",
      out_for_delivery: "OUT_FOR_DELIVERY",
      delivered: "DELIVERED",
      failed: "FAILED",
      returned: "RETURNED",
      lost: "LOST",
      cancelled: "CANCELLED",
    };
    return map[status.toLowerCase()] || "PENDING";
  }

  private fallbackShipment(shipmentId: string, service: string): CreateShipmentResult {
    return {
      trackingNumber: `SHIP-${shipmentId}`,
      providerRef: `shipit-${shipmentId}`,
      service,
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

export const shipitProvider = new ShipitProvider();
