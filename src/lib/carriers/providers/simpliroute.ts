/**
 * Provider SIMPLIROUTE
 * Integración con SimpliRoute para flota propia / última milla.
 */

import { BaseCarrierProvider } from "../base";
import type { CreateShipmentContext, CreateShipmentResult, TrackingEvent } from "../types";
import type { CarrierMode, ShipmentStatus } from "@prisma/client";
import { fetchWithRetry } from "../utils/http";
import { parseProviderError } from "../utils/http";

const SIMPLIROUTE_BASE_URL = process.env.SIMPLIROUTE_API_URL || "https://api.simpliroute.com";

export class SimpliRouteProvider extends BaseCarrierProvider {
  readonly code = "SIMPLIROUTE" as const;
  readonly name = "SimpliRoute";
  readonly supportedModes: CarrierMode[] = ["EXTERNAL_OWN_FLEET", "COURIER"];
  readonly canQuote = false;
  readonly canPrintLabel = false;
  readonly canTrack = true;
  readonly canWebhook = true;
  readonly requiredConfig = ["apiKey", "accountId"];

  async createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult> {
    this.logProviderCall("createShipment", { shipmentId: ctx.shipmentId });
    const { apiKey, accountId } = ctx.carrierConfig as {
      apiKey?: unknown;
      accountId?: unknown;
    };
    if (!apiKey || !accountId) {
      this.logProviderCall("createShipment:fallback", { reason: "missing credentials" });
      return this.fallbackShipment(ctx.shipmentId);
    }
    try {
      const response = await fetchWithRetry(
        `${SIMPLIROUTE_BASE_URL}/api/v1/account/${encodeURIComponent(String(accountId))}/shipments`,
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
        trackingNumber: data.tracking_number || `SIM-${ctx.shipmentId.slice(0, 8).toUpperCase()}`,
        providerRef: data.id || `simpliroute-${ctx.shipmentId}`,
        service: data.service || "Own Fleet",
        trackingUrl: data.tracking_url,
        rawResponse: data,
      };
    } catch (error) {
      const parsed = parseProviderError(error);
      console.error(`[Carrier:SIMPLIROUTE] Error creando envío:`, parsed.message);
      return this.fallbackShipment(ctx.shipmentId);
    }
  }

  async track(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<TrackingEvent[]> {
    const { apiKey, accountId } = carrierConfig as {
      apiKey?: unknown;
      accountId?: unknown;
    };
    if (!apiKey || !accountId) return [];
    try {
      const response = await fetchWithRetry(
        `${SIMPLIROUTE_BASE_URL}/api/v1/account/${encodeURIComponent(String(accountId))}/shipments/${encodeURIComponent(providerRef)}/tracking`,
        { method: "GET", headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return (data.events || []).map((e: any) => ({
        status: this.mapSimpliRouteStatus(e.status) as ShipmentStatus,
        occurredAt: new Date(e.occurred_at || e.date || new Date().toISOString()),
        description: e.description || e.status,
        location: e.location,
        rawData: e,
      }));
    } catch (error) {
      const parsed = parseProviderError(error);
      console.error(`[Carrier:SIMPLIROUTE] Error obteniendo tracking:`, parsed.message);
      return [];
    }
  }

  private mapSimpliRouteStatus(status: string): ShipmentStatus {
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
      trackingNumber: `SIM-${shipmentId.slice(0, 8).toUpperCase()}`,
      providerRef: `simpliroute-${shipmentId}`,
      service: "Own Fleet",
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.apiKey || typeof config.apiKey !== "string" || config.apiKey.trim() === "") {
      errors.push("Configuración requerida faltante: apiKey");
    }
    if (
      !config.accountId ||
      typeof config.accountId !== "string" ||
      config.accountId.trim() === ""
    ) {
      errors.push("Configuración requerida faltante: accountId");
    }
    return { valid: errors.length === 0, errors };
  }
}

export const simplirouteProvider = new SimpliRouteProvider();
