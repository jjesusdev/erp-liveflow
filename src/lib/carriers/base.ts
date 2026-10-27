/**
 * Clase base abstracta para proveedores de carriers.
 * Implementa CarrierProvider y proporciona helpers comunes.
 */

import type {
  CarrierProvider,
  CreateShipmentContext,
  CreateShipmentResult,
  TrackingEvent,
  Quote,
} from "./types";
import type { CarrierApiProvider, CarrierMode, ShipmentStatus } from "@prisma/client";

/**
 * Proveedor base de carrier con utilidades compartidas.
 *
 * Todas las implementaciones concretas deben extender esta clase
 * y definir los campos readonly y el método createShipment.
 */
export abstract class BaseCarrierProvider implements CarrierProvider {
  /** Código único del proveedor */
  abstract readonly code: CarrierApiProvider;
  /** Nombre legible */
  abstract readonly name: string;
  /** Modos de envío soportados */
  abstract readonly supportedModes: CarrierMode[];
  /** Si soporta cotización automática */
  abstract readonly canQuote: boolean;
  /** Si soporta impresión de etiquetas */
  abstract readonly canPrintLabel: boolean;
  /** Si soporta tracking automático */
  abstract readonly canTrack: boolean;
  /** Si soporta webhooks */
  abstract readonly canWebhook: boolean;
  /** Configuración requerida */
  abstract readonly requiredConfig: string[];

  /**
   * Crea un envío en el proveedor externo.
   */
  abstract createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult>;

  /**
   * Obtiene tracking del envío.
   * Implementación por defecto que lanza si el proveedor no soporta tracking.
   */
  track?(providerRef: string, carrierConfig: Record<string, unknown>): Promise<TrackingEvent[]>;

  /**
   * Imprime/regenera etiqueta.
   * Implementación por defecto que lanza si no soportado.
   */
  printLabel?(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<{ labelUrl: string }>;

  /**
   * Cotiza envío.
   */
  quote?(ctx: CreateShipmentContext): Promise<Quote>;

  /**
   * Procesa webhook del proveedor.
   */
  webhook?(payload: unknown, carrierConfig: Record<string, unknown>): Promise<void>;

  /**
   * Valida la configuración del carrier.
   * Por defecto verifica presencia de campos requeridos.
   */
  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    return this.validateConfigBasic(config);
  }

  /**
   * Registra una llamada al proveedor para debugging/auditoría.
   */
  protected logProviderCall(method: string, params?: unknown): void {
    // Evitar dependencia de logger externo; usar console por ahora
    // eslint-disable-next-line no-console
    console.log(`[Carrier:${this.code}] ${method}`, params ?? "");
  }

  /**
   * Valida que la configuración contenga los campos requeridos.
   * Helpers para validarConfig.
   */
  protected validateConfigBasic(config: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    for (const key of this.requiredConfig) {
      if (
        !(key in config) ||
        config[key] === undefined ||
        config[key] === null ||
        config[key] === ""
      ) {
        errors.push(`Configuración requerida faltante: ${key}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Mapea un error de proveedor a un evento de tracking normalizado.
   */
  protected mapErrorToTrackingEvent(error: unknown, providerRef?: string): TrackingEvent {
    const message = error instanceof Error ? error.message : String(error);
    const status: ShipmentStatus = "FAILED";
    return {
      status,
      occurredAt: new Date(),
      description: `Error del proveedor ${this.code}${providerRef ? ` [${providerRef}]` : ""}: ${message}`,
      location: undefined,
      rawData: { error: message, providerRef },
    };
  }
}
