/**
 * Provider BEETRACK
 * Integración con Beetrack para seguimiento de flota.
 */

import { BaseCarrierProvider } from "../base";
import type { CreateShipmentContext, CreateShipmentResult, TrackingEvent } from "../types";
import type { CarrierMode, ShipmentStatus } from "@prisma/client";
import { fetchWithRetry } from "../utils/http";
import { parseProviderError } from "../utils/http";

const BEETRACK_BASE_URL = process.env.BEETRACK_API_URL || "https://api.beetrack.com";

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
    const { apiKey, organizationId } = ctx.carrierConfig as {
      apiKey?: unknown;
      organizationId?: unknown;
    };
    if (!apiKey || !organizationId) {
      this.logProviderCall("createShipment:fallback", { reason: "missing credentials" });
      return this.fallbackShipment(ctx.shipmentId);
    }
    try {
      const response = await fetchWithRetry(
        `${BEETRACK_BASE_URL}/api/v1/organizations/${encodeURIComponent(String(organizationId))}/shipments`,
        {
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
        }
      );
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const parsed = parseProviderError(body || `HTTP ${response.status}`);
        throw new Error(parsed.message);
      }
      const data = await response.json();
      return {
        trackingNumber: data.tracking_number || `BET-${ctx.shipmentId.slice(0, 8).toUpperCase()}`,
        providerRef: data.id || `beetrack-${ctx.shipmentId}`,
        service: data.service || "Fleet",
        trackingUrl: data.tracking_url,
        rawResponse: data,
      };
    } catch (error) {
      const parsed = parseProviderError(error);
      console.error(`[Carrier:BEETRACK] Error creando envío:`, parsed.message);
      return this.fallbackShipment(ctx.shipmentId);
    }
  }

  async track(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<TrackingEvent[]> {
    const { apiKey, organizationId } = carrierConfig as {
      apiKey?: unknown;
      organizationId?: unknown;
    };
    if (!apiKey || !organizationId) return [];
    try {
      const response = await fetchWithRetry(
        `${BEETRACK_BASE_URL}/api/v1/organizations/${encodeURIComponent(String(organizationId))}/shipments/${encodeURIComponent(providerRef)}/tracking`,
        { method: "GET", headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return (data.events || []).map((e: any) => ({
        status: this.mapBeetrackStatus(e.status) as ShipmentStatus,
        occurredAt: new Date(e.occurred_at || e.date || new Date().toISOString()),
        description: e.description || e.status,
        location: e.location,
        rawData: e,
      }));
    } catch (error) {
      const parsed = parseProviderError(error);
      console.error(`[Carrier:BEETRACK] Error obteniendo tracking:`, parsed.message);
      return [];
    }
  }

  private mapBeetrackStatus(status: string): ShipmentStatus {
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
      trackingNumber: `BET-${shipmentId.slice(0, 8).toUpperCase()}`,
      providerRef: `beetrack-${shipmentId}`,
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
