/**
 * Interfaz y tipos para proveedores de envíos (Carrier Providers).
 * Cada carrier implementa esta interfaz para operaciones: crear envío, tracking, etiquetas, webhooks.
 */

import type { CarrierApiProvider, ShipmentStatus, CarrierMode, ShipmentMode } from "@prisma/client";

/**
 * Contexto para crear un envío a través del proveedor
 */
export interface CreateShipmentContext {
  /** ID del shipment en nuestra BD */
  shipmentId: string;
  /** Número de tracking si ya existe (para MANUAL) */
  trackingNumber?: string | null;
  /** Nombre del carrier (para MANUAL) */
  carrierName?: string | null;
  /** Datos del destinatario */
  recipient: {
    name: string;
    phone: string;
    email?: string;
  };
  /** Dirección de entrega */
  address: {
    street: string;
    number: string;
    colonia?: string;
    city: string;
    state: string;
    zipCode: string;
    notes?: string;
  };
  /** Dimensiones del paquete */
  dimensions?: {
    width: number;
    height: number;
    length: number;
    unit: "cm" | "in";
  };
  /** Peso en gramos */
  weightGrams?: number;
  /** Referencia del proveedor (ej. ID de orden en Chilexpress) */
  providerRef?: string;
  /** Configuración específica del carrier (API keys, etc.) */
  carrierConfig: Record<string, unknown>;
  /** Modo de envío (ShipmentMode del modelo Shipment) */
  mode: ShipmentMode;
}

/**
 * Resultado de crear un envío en el proveedor externo
 */
export interface CreateShipmentResult {
  /** Número de tracking asignado por el proveedor */
  trackingNumber: string;
  /** URL de la etiqueta de envío (PDF/ZPL) */
  labelUrl?: string;
  /** URL de tracking público */
  trackingUrl?: string;
  /** Referencia interna del proveedor (ej. order_id) */
  providerRef: string;
  /** Servicio utilizado (ej. "Estándar", "Express") */
  service?: string;
  /** Costo estimado en centavos CLP/MXN */
  costClp?: number;
  /** Datos adicionales del proveedor */
  rawResponse?: Record<string, unknown>;
}

/**
 * Evento de tracking devuelto por el proveedor
 */
export interface TrackingEvent {
  /** Estado del envío */
  status: ShipmentStatus;
  /** Timestamp del evento */
  occurredAt: Date;
  /** Descripción del evento */
  description: string;
  /** Ubicación si aplica */
  location?: string;
  /** Datos raw del proveedor */
  rawData?: Record<string, unknown>;
}

/**
 * Cotización de envío (opcional, para fase futura)
 */
export interface Quote {
  /** Costo estimado en centavos */
  costClp: number;
  /** Tiempo estimado de entrega en días */
  estimatedDays: number;
  /** Servicio ofertado */
  service: string;
  /** Moneda */
  currency: string;
  /** Validez de la cotización */
  validUntil: Date;
}

/**
 * Interfaz principal que deben implementar todos los carriers
 */
export interface CarrierProvider {
  /** Código único del proveedor (debe coincidir con CarrierApiProvider enum) */
  readonly code: CarrierApiProvider;
  /** Nombre legible */
  readonly name: string;
  /** Modos de envío soportados */
  readonly supportedModes: CarrierMode[];
  /** Si soporta cotización automática */
  readonly canQuote: boolean;
  /** Si soporta impresión de etiquetas */
  readonly canPrintLabel: boolean;
  /** Si soporta tracking automático */
  readonly canTrack: boolean;
  /** Si soporta webhooks */
  readonly canWebhook: boolean;
  /** Configuración requerida (campos que el usuario debe proveer) */
  readonly requiredConfig: string[];

  /**
   * Crea un envío en el proveedor externo
   * @returns Datos del envío creado (tracking, etiqueta, etc.)
   */
  createShipment(ctx: CreateShipmentContext): Promise<CreateShipmentResult>;

  /**
   * Obtiene tracking del envío (opcional)
   */
  track?(providerRef: string, carrierConfig: Record<string, unknown>): Promise<TrackingEvent[]>;

  /**
   * Imprime/regenera etiqueta (opcional)
   */
  printLabel?(
    providerRef: string,
    carrierConfig: Record<string, unknown>
  ): Promise<{ labelUrl: string }>;

  /**
   * Cotiza envío (opcional - fase futura)
   */
  quote?(ctx: CreateShipmentContext): Promise<Quote>;

  /**
   * Procesa webhook del proveedor (opcional)
   */
  webhook?(payload: unknown, carrierConfig: Record<string, unknown>): Promise<void>;

  /**
   * Valida la configuración del carrier
   */
  validateConfig?(config: Record<string, unknown>): { valid: boolean; errors: string[] };
}

/**
 * Tipo para el registro de proveedores
 */
export type CarrierProviderRegistry = Map<CarrierApiProvider, CarrierProvider>;
