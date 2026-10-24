/**
 * Registro global de proveedores de envíos (Carrier Providers).
 * Permite registrar y obtener proveedores por su código.
 */

import type { CarrierProvider, CarrierProviderRegistry } from "./types";
import type { CarrierApiProvider } from "@prisma/client";
import { manualProvider } from "./manual";

/**
 * Registro interno de proveedores
 */
const providers: CarrierProviderRegistry = new Map();

/**
 * Registra un proveedor en el registro global
 */
export function registerCarrierProvider(provider: CarrierProvider): void {
  if (providers.has(provider.code)) {
    console.warn(`[CarrierRegistry] Provider ${provider.code} ya registrado, sobrescribiendo`);
  }
  providers.set(provider.code, provider);
}

/**
 * Obtiene un proveedor por su código
 */
export function getCarrierProvider(code: CarrierApiProvider): CarrierProvider | undefined {
  return providers.get(code);
}

/**
 * Obtiene todos los proveedores registrados
 */
export function getAllCarrierProviders(): CarrierProvider[] {
  return Array.from(providers.values());
}

/**
 * Verifica si un proveedor está registrado
 */
export function hasCarrierProvider(code: CarrierApiProvider): boolean {
  return providers.has(code);
}

/**
 * Inicializa el registro con los proveedores base
 * Se llama al arrancar la aplicación
 */
export function initializeCarrierRegistry(): void {
  // Registrar provider MANUAL (siempre disponible)
  registerCarrierProvider(manualProvider);

  // TODO: Fase 4.2+ - Registrar otros proveedores cuando se implementen
  // registerCarrierProvider(chilexpressProvider);
  // registerCarrierProvider(blueProvider);
  // registerCarrierProvider(shipitProvider);
  // registerCarrierProvider(enviameProvider);
  // registerCarrierProvider(starkenProvider);
  // registerCarrierProvider(correosProvider);
  // registerCarrierProvider(simplirouteProvider);
  // registerCarrierProvider(beetrackProvider);
}

/**
 * Obtiene la lista de proveedores disponibles con metadata para UI
 */
export function getAvailableProviders() {
  return getAllCarrierProviders().map((p) => ({
    code: p.code,
    name: p.name,
    supportedModes: p.supportedModes,
    canQuote: p.canQuote,
    canPrintLabel: p.canPrintLabel,
    canTrack: p.canTrack,
    canWebhook: p.canWebhook,
    requiredConfig: p.requiredConfig,
  }));
}

// Inicializar al importar el módulo
initializeCarrierRegistry();
