/**
 * Provider STARKEN
 * Integración con el carrier Starken para envíos tipo COURIER.
 */

import { BaseCarrierProvider } from "../base";
import type { CreateShipmentContext, CreateShipmentResult, TrackingEvent } from "../types";
import type { CarrierMode, ShipmentStatus } from "@prisma/client";
import { fetchWithRetry } from "../utils/http";
import { parseProviderError } from "../utils/http";

const STARKEN_BASE_URL = process.env.STARKEN_API_URL || "https://api.starken.cl";

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
    const { apiKey } = ctx.carrierConfig as { apiKey?: unknown };
    if (!apiKey) {
      this.logProviderCall("createShipment:fallback", { reason: "missing credentials" });
      return this.fallbackShipment(ctx.shipmentId);
    }
    try {
      const response = await fetchWithRetry(`${STARKEN_BASE_URL}/api/v1/shipments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
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
        trackingNumber: data.tracking_number || `STK-${ctx.shipmentId.slice(0, 8).toUpperCase()}`,
        providerRef: data.id || `starken-${ctx.shipmentId}`,
        service: data.service || "Estandar",
        labelUrl: data.label_url,
        trackingUrl: data.tracking_url,
        rawResponse: data,
      };
    } catch (error) {
      const parsed = parseProviderError(error);
      console.error(`[Carrier:STARKEN] Error creando envío:`, parsed.message);
      return this.fallbackShipment(ctx.shipmentId);
    }
  }

  async track(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<TrackingEvent[]> {
    const { apiKey } = carrierConfig as { apiKey?: unknown };
    if (!apiKey) return [];
    try {
      const response = await fetchWithRetry(
        `${STARKEN_BASE_URL}/api/v1/shipments/${encodeURIComponent(providerRef)}/tracking`,
        { method: "GET", headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return (data.events || []).map((e: any) => ({
        status: this.mapStarkenStatus(e.status) as ShipmentStatus,
        occurredAt: new Date(e.occurred_at || e.date || new Date().toISOString()),
        description: e.description || e.status,
        location: e.location,
        rawData: e,
      }));
    } catch (error) {
      const parsed = parseProviderError(error);
      console.error(`[Carrier:STARKEN] Error obteniendo tracking:`, parsed.message);
      return [];
    }
  }

  async printLabel(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<{ labelUrl: string }> {
    return {
      labelUrl: `${STARKEN_BASE_URL}/api/v1/shipments/${encodeURIComponent(providerRef)}/label`,
    };
  }

  private mapStarkenStatus(status: string): ShipmentStatus {
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
      trackingNumber: `STK-${shipmentId.slice(0, 8).toUpperCase()}`,
      providerRef: `starken-${shipmentId}`,
      service: "Estandar",
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    if (!config.apiKey || typeof config.apiKey !== "string" || config.apiKey.trim() === "") {
      return { valid: false, errors: ["Configuración requerida faltante: apiKey"] };
    }
    return { valid: true, errors: [] };
  }
}

export const starkenProvider = new StarkenProvider();
