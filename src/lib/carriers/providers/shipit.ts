/**
 * Provider SHIPIT
 * Integración con el carrier Shipit para envíos tipo COURIER.
 * Soporta creación de envío, impresión de etiqueta y tracking.
 *
 * NOTA: Los caminos de endpoint y cabeceras de autenticación de Shipit
 * deben confirmarse contra la documentación oficial de la API de Shipit
 * antes de conectar contra un entorno real. Hoy se usan valores razonables
 * documentados acá y se puede sobrescribir la base URL con SHIPIT_BASE_URL.
 *
 * - code: SHIPIT
 * - supportedModes: [COURIER]
 * - canQuote: false
 * - canPrintLabel: true
 * - canTrack: true
 * - canWebhook: false
 * - requiredConfig: ['apiKey','apiSecret']
 *
 * Comportamiento:
 * - Si se proveen credenciales (apiKey + apiSecret, en config del Carrier o
 *   en variables de entorno SHIPIT_API_KEY / SHIPIT_API_SECRET) se realizan
 *   llamadas HTTP reales mediante fetchWithRetry + parseProviderError.
 * - Si NO hay credenciales, se comporta como stub simulado (fallback seguro,
 *   sin llamadas HTTP).
 */

import { BaseCarrierProvider } from "../base";
import { fetchWithRetry, parseProviderError } from "../utils/http";
import type { CreateShipmentContext, CreateShipmentResult, TrackingEvent } from "../types";
import type { CarrierMode, ShipmentStatus } from "@prisma/client";

/** URL base de la API de Shipit (sobrescribible por variable de entorno). */
const SHIPIT_BASE_URL = process.env.SHIPIT_BASE_URL ?? "https://api.shipit.cl";

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
   * Resuelve credenciales: prioridad a la config del Carrier (DB), fallback a
   * variables de entorno. Nunca hardcodea credenciales.
   */
  private resolveConfig(carrierConfig: Record<string, unknown>): {
    apiKey: string | undefined;
    apiSecret: string | undefined;
  } {
    return {
      apiKey: (carrierConfig.apiKey as string | undefined) ?? process.env.SHIPIT_API_KEY,
      apiSecret: (carrierConfig.apiSecret as string | undefined) ?? process.env.SHIPIT_API_SECRET,
    };
  }

  private hasCredentials(config: {
    apiKey: string | undefined;
    apiSecret: string | undefined;
  }): boolean {
    return Boolean(
      config.apiKey &&
      typeof config.apiKey === "string" &&
      config.apiKey.trim() !== "" &&
      config.apiSecret &&
      typeof config.apiSecret === "string" &&
      config.apiSecret.trim() !== ""
    );
  }

  /**
   * Ejecuta una petición contra la API de Shipit con reintentos y normalización
   * de errores. Lanza un error con `statusCode` cuando la API responde 4xx/5xx.
   */
  private async request(
    config: { apiKey: string | undefined; apiSecret: string | undefined },
    opts: {
      method: "GET" | "POST";
      path: string;
      body?: unknown;
    }
  ): Promise<unknown> {
    const url = `${SHIPIT_BASE_URL}${opts.path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Api-Key": config.apiKey ?? "",
      "X-Api-Secret": config.apiSecret ?? "",
    };

    let response: Response;
    try {
      response = await fetchWithRetry(url, {
        method: opts.method,
        headers,
        ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
      });
    } catch (err) {
      const parsed = parseProviderError(err);
      throw new Error(`Error de red consultando Shipit: ${parsed.message}`, { cause: err });
    }

    if (!response.ok) {
      let detail = "";
      try {
        const body = (await response.json()) as Record<string, unknown>;
        detail = String(body?.message ?? body?.error ?? JSON.stringify(body));
      } catch {
        // El cuerpo no es JSON; se usa statusText como detalle.
      }
      const error = new Error(
        `Shipit API respondió ${response.status}: ${detail || response.statusText}`
      ) as Error & { statusCode?: number };
      error.statusCode = response.status;
      throw error;
    }

    return response.json();
  }

  /**
   * Crea un envío en Shipit.
   * Con credenciales → POST real a la API y mapea la respuesta.
   * Sin credenciales → stub simulado (tracking ficticio, sin HTTP).
   */
  async createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult> {
    this.logProviderCall("createShipment", { shipmentId: ctx.shipmentId });

    const config = this.resolveConfig(ctx.carrierConfig);

    // Sin credenciales → stub simulado (fallback seguro, sin llamadas HTTP).
    if (!this.hasCredentials(config)) {
      const trackingNumber = ctx.trackingNumber ?? `SHIP-${ctx.shipmentId}`;
      const providerRef = `shipit-${ctx.shipmentId}`;
      return {
        trackingNumber,
        providerRef,
        service: "Standard",
        rawResponse: { note: "Stub simulado - no se configuraron credenciales de Shipit" },
      };
    }

    const payload = {
      recipient_name: ctx.recipient.name,
      recipient_phone: ctx.recipient.phone,
      recipient_email: ctx.recipient.email ?? null,
      address_street: ctx.address.street,
      address_number: ctx.address.number,
      address_colonia: ctx.address.colonia ?? null,
      address_city: ctx.address.city,
      address_state: ctx.address.state,
      address_zip_code: ctx.address.zipCode,
      address_notes: ctx.address.notes ?? null,
      weight_grams: ctx.weightGrams ?? null,
      reference: ctx.shipmentId,
    };

    const data = (await this.request(config, {
      method: "POST",
      path: "/v1/shipments",
      body: payload,
    })) as Record<string, unknown>;

    return {
      trackingNumber:
        (data.tracking_number as string | undefined) ??
        (data.trackingNumber as string | undefined) ??
        `SHIP-${ctx.shipmentId}`,
      providerRef:
        (data.id as string | undefined) ??
        (data.provider_ref as string | undefined) ??
        (data.providerRef as string | undefined) ??
        `shipit-${ctx.shipmentId}`,
      service: ((data.service as string | undefined) ?? "Standard") || "Standard",
      labelUrl: (data.label_url as string | undefined) ?? (data.labelUrl as string | undefined),
      trackingUrl:
        (data.tracking_url as string | undefined) ?? (data.trackingUrl as string | undefined),
      costClp: (data.cost_clp as number | undefined) ?? (data.costClp as number | undefined),
      rawResponse: data,
    };
  }

  /**
   * Obtiene tracking de un envío en Shipit.
   * Con credenciales → GET real a la API y mapea eventos.
   * Sin credenciales → array vacío (stub).
   */
  async track(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<TrackingEvent[]> {
    this.logProviderCall("track", { providerRef });

    const config = this.resolveConfig(carrierConfig);

    // Sin credenciales → stub (sin llamadas HTTP).
    if (!this.hasCredentials(config)) {
      return [];
    }

    const data = (await this.request(config, {
      method: "GET",
      path: `/v1/shipments/${encodeURIComponent(providerRef)}/tracking`,
    })) as Record<string, unknown>;

    const rawEvents: unknown[] = Array.isArray(data?.events)
      ? data.events
      : Array.isArray(data)
        ? data
        : [];

    return rawEvents.map((e) => this.mapTrackingEvent(e as Record<string, unknown>));
  }

  /**
   * Parsea una fecha cruda (string ISO o Date) a Date. Si no hay valor, usa ahora.
   */
  private parseDate(value: string | Date | undefined): Date {
    if (value instanceof Date) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }

  /**
   * Mapea un evento de tracking de Shipit al formato TrackingEvent interno.
   */
  private mapTrackingEvent(raw: Record<string, unknown>): TrackingEvent {
    const statusRaw = raw.status ?? raw.estado ?? raw.state ?? raw.status_code ?? "PENDING";
    return {
      status: this.mapStatus(statusRaw),
      occurredAt: this.parseDate(
        (raw.occurred_at as string | undefined) ??
          (raw.occurredAt as string | undefined) ??
          (raw.fecha as string | undefined)
      ),
      description: String(raw.description ?? raw.descripcion ?? raw.detail ?? ""),
      location: (raw.location as string | undefined) ?? (raw.ubicacion as string | undefined),
      rawData: raw,
    };
  }

  /**
   * Mapea un estado crudo de Shipit a ShipmentStatus del dominio.
   */
  private mapStatus(raw: unknown): ShipmentStatus {
    const s = String(raw ?? "")
      .toUpperCase()
      .trim();
    const map: Record<string, ShipmentStatus> = {
      PENDING: "PENDING",
      CREATED: "READY",
      READY: "READY",
      LABEL_PRINTED: "LABEL_PRINTED",
      PICKED_UP: "PICKED_UP",
      IN_TRANSIT: "IN_TRANSIT",
      OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
      DELIVERED: "DELIVERED",
      FAILED: "FAILED",
      RETURNED: "RETURNED",
      LOST: "LOST",
      CANCELLED: "CANCELLED",
      EXCEPTION: "FAILED",
    };
    return map[s] ?? "PENDING";
  }

  /**
   * Valida que la configuración contenga apiKey y apiSecret.
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
