/**
 * Provider BLUE EXPRESS
 * Integración con el carrier Blue Express para envíos tipo COURIER.
 * Soporta impresión de etiqueta y tracking, sin cotización ni webhooks.
 */

import { BaseCarrierProvider } from "../base";
import type { CreateShipmentContext, CreateShipmentResult, TrackingEvent } from "../types";
import type { CarrierMode, ShipmentStatus } from "@prisma/client";
import { fetchWithRetry } from "../utils/http";
import { parseProviderError } from "../utils/http";

const BLUE_BASE_URL = process.env.BLUE_API_URL || "https://api.blueexpress.cl";

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
    const { apiKey, apiSecret } = ctx.carrierConfig as {
      apiKey?: unknown;
      apiSecret?: unknown;
    };
    if (!apiKey || !apiSecret) {
      this.logProviderCall("createShipment:fallback", { reason: "missing credentials" });
      return this.fallbackShipment(ctx.shipmentId);
    }
    try {
      const response = await fetchWithRetry(`${BLUE_BASE_URL}/api/v1/shipments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": String(apiKey),
          "X-Api-Secret": String(apiSecret),
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
        trackingNumber: data.tracking_number || `BLUE-${ctx.shipmentId.slice(0, 8).toUpperCase()}`,
        providerRef: data.id || `blue-${ctx.shipmentId}`,
        service: data.service || "Standard",
        labelUrl: data.label_url,
        trackingUrl: data.tracking_url,
        rawResponse: data,
      };
    } catch (error) {
      const parsed = parseProviderError(error);
      console.error(`[Carrier:BLUE] Error creando envío:`, parsed.message);
      return this.fallbackShipment(ctx.shipmentId);
    }
  }

  async track(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<TrackingEvent[]> {
    const { apiKey, apiSecret } = carrierConfig as {
      apiKey?: unknown;
      apiSecret?: unknown;
    };
    if (!apiKey || !apiSecret) return [];
    try {
      const response = await fetchWithRetry(
        `${BLUE_BASE_URL}/api/v1/shipments/${encodeURIComponent(providerRef)}/tracking`,
        {
          method: "GET",
          headers: {
            "X-Api-Key": String(apiKey),
            "X-Api-Secret": String(apiSecret),
          },
        }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return (data.events || []).map((e: any) => ({
        status: this.mapBlueStatus(e.status) as ShipmentStatus,
        occurredAt: new Date(e.occurred_at || e.date || new Date().toISOString()),
        description: e.description || e.status,
        location: e.location,
        rawData: e,
      }));
    } catch (error) {
      const parsed = parseProviderError(error);
      console.error(`[Carrier:BLUE] Error obteniendo tracking:`, parsed.message);
      return [];
    }
  }

  async printLabel(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<{ labelUrl: string }> {
    return {
      labelUrl: `${BLUE_BASE_URL}/api/v1/shipments/${encodeURIComponent(providerRef)}/label`,
    };
  }

  private mapBlueStatus(status: string): ShipmentStatus {
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

  private fallbackShipment(shipmentId: string): CreateShipmentResult {
    return {
      trackingNumber: `BLUE-${shipmentId.slice(0, 8).toUpperCase()}`,
      providerRef: `blue-${shipmentId}`,
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
