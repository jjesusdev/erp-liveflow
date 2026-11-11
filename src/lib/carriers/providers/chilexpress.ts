/**
 * Provider CHILEXPRESS
 * Integración con el carrier Chilexpress para envíos tipo COURIER.
 * Soporta impresión de etiqueta y tracking, sin cotización ni webhooks.
 */

import { BaseCarrierProvider } from "../base";
import type { CreateShipmentContext, CreateShipmentResult, TrackingEvent } from "../types";
import type { CarrierMode, ShipmentStatus } from "@prisma/client";
import { fetchWithRetry } from "../utils/http";
import { parseProviderError } from "../utils/http";

export class ChilexpressProvider extends BaseCarrierProvider {
  readonly code = "CHILEXPRESS" as const;
  readonly name = "Chilexpress";
  readonly supportedModes: CarrierMode[] = ["COURIER"];
  readonly canQuote = false;
  readonly canPrintLabel = true;
  readonly canTrack = true;
  readonly canWebhook = false;
  readonly requiredConfig = ["clientId", "clientSecret", "subdomain"];

  private baseUrl(config: { subdomain?: unknown }): string {
    const subdomain = String(config.subdomain || "api");
    return `https://${subdomain}.chilexpress.com/api/v1`;
  }

  async createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult> {
    this.logProviderCall("createShipment", { shipmentId: ctx.shipmentId });
    const { clientId, clientSecret, subdomain } = ctx.carrierConfig as {
      clientId?: unknown;
      clientSecret?: unknown;
      subdomain?: unknown;
    };
    if (!clientId || !clientSecret || !subdomain) {
      this.logProviderCall("createShipment:fallback", { reason: "missing credentials" });
      return this.fallbackShipment(ctx.shipmentId);
    }
    try {
      const response = await fetchWithRetry(`${this.baseUrl({ subdomain })}/shipments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Id": String(clientId),
          "X-Client-Secret": String(clientSecret),
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
        trackingNumber: data.tracking_number || `CHX-${ctx.shipmentId.slice(0, 8).toUpperCase()}`,
        providerRef: data.id || `chilexpress-${ctx.shipmentId}`,
        service: data.service || "Normal",
        labelUrl: data.label_url,
        trackingUrl: data.tracking_url,
        rawResponse: data,
      };
    } catch (error) {
      const parsed = parseProviderError(error);
      console.error(`[Carrier:CHILEXPRESS] Error creando envío:`, parsed.message);
      return this.fallbackShipment(ctx.shipmentId);
    }
  }

  async track(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<TrackingEvent[]> {
    const { clientId, clientSecret, subdomain } = carrierConfig as {
      clientId?: unknown;
      clientSecret?: unknown;
      subdomain?: unknown;
    };
    if (!clientId || !clientSecret || !subdomain) return [];
    try {
      const response = await fetchWithRetry(
        `${this.baseUrl({ subdomain })}/shipments/${encodeURIComponent(providerRef)}/tracking`,
        {
          method: "GET",
          headers: {
            "X-Client-Id": String(clientId),
            "X-Client-Secret": String(clientSecret),
          },
        }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return (data.events || []).map((e: any) => ({
        status: this.mapChilexpressStatus(e.status) as ShipmentStatus,
        occurredAt: new Date(e.occurred_at || e.date || new Date().toISOString()),
        description: e.description || e.status,
        location: e.location,
        rawData: e,
      }));
    } catch (error) {
      const parsed = parseProviderError(error);
      console.error(`[Carrier:CHILEXPRESS] Error obteniendo tracking:`, parsed.message);
      return [];
    }
  }

  async printLabel(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<{ labelUrl: string }> {
    const { subdomain } = carrierConfig as { subdomain?: unknown };
    return {
      labelUrl: `${this.baseUrl({ subdomain })}/shipments/${encodeURIComponent(providerRef)}/label`,
    };
  }

  private mapChilexpressStatus(status: string): ShipmentStatus {
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
      trackingNumber: `CHX-${shipmentId.slice(0, 8).toUpperCase()}`,
      providerRef: `chilexpress-${shipmentId}`,
      service: "Normal",
    };
  }

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

export const chilexpressProvider = new ChilexpressProvider();
