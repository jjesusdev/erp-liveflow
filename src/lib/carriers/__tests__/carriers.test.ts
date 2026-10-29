import { describe, it, expect, beforeEach } from "vitest";
import {
  getCarrierProvider,
  getAllCarrierProviders,
  hasCarrierProvider,
  getAvailableProviders,
  registerCarrierProvider,
} from "@/lib/carriers/registry";
import { manualProvider } from "@/lib/carriers/manual";
import type { CarrierProvider, CreateShipmentContext } from "@/lib/carriers/types";
import type { CarrierApiProvider, CarrierMode } from "@prisma/client";

// Provider de prueba para tests
class TestProvider implements CarrierProvider {
  readonly code: CarrierApiProvider = "MANUAL" as CarrierApiProvider;
  readonly name = "Test Provider";
  readonly supportedModes: CarrierMode[] = ["COURIER"];
  readonly canQuote = false;
  readonly canPrintLabel = false;
  readonly canTrack = false;
  readonly canWebhook = false;
  readonly requiredConfig: string[] = [];

  async createShipment(_ctx: CreateShipmentContext) {
    return {
      trackingNumber: "TEST-123",
      providerRef: "test-ref",
      service: "Test",
    };
  }

  validateConfig() {
    return { valid: true, errors: [] };
  }
}

describe("Carrier Registry", () => {
  beforeEach(() => {
    // Limpiar el registro antes de cada test
    // Nota: El registry es un singleton, así que no podemos limpiarlo fácilmente
    // En tests reales se usaría un mock o se reiniciaría el módulo
  });

  it("should have MANUAL provider registered by default", () => {
    const provider = getCarrierProvider("MANUAL");
    expect(provider).toBeDefined();
    expect(provider?.code).toBe("MANUAL");
    expect(provider?.name).toBe("Manual / Sin API");
  });

  it("should return undefined for unknown provider", () => {
    const provider = getCarrierProvider("UNKNOWN" as CarrierApiProvider);
    expect(provider).toBeUndefined();
  });

  it("should return all registered providers", () => {
    const providers = getAllCarrierProviders();
    expect(providers.length).toBeGreaterThanOrEqual(1);
    expect(providers.some((p) => p.code === "MANUAL")).toBe(true);
  });

  it("should check if provider exists", () => {
    expect(hasCarrierProvider("MANUAL")).toBe(true);
    expect(hasCarrierProvider("CHILEXPRESS")).toBe(true);
  });

  it("should return available providers with metadata", () => {
    const available = getAvailableProviders();
    expect(available.length).toBeGreaterThanOrEqual(1);
    const manual = available.find((p) => p.code === "MANUAL");
    expect(manual).toBeDefined();
    expect(manual?.supportedModes).toContain("COURIER");
    expect(manual?.canQuote).toBe(false);
    expect(manual?.canTrack).toBe(false);
  });

  it("should allow registering new provider", () => {
    const testProvider = new TestProvider();
    registerCarrierProvider(testProvider);

    const provider = getCarrierProvider("MANUAL");
    expect(provider).toBe(testProvider);
    expect(provider?.name).toBe("Test Provider");
  });

  it("should use ManualProvider as singleton", () => {
    expect(manualProvider).toBeDefined();
    expect(manualProvider.code).toBe("MANUAL");
  });
});

describe("ManualProvider", () => {
  let provider: typeof manualProvider;

  beforeEach(() => {
    provider = manualProvider;
  });

  it("should have correct metadata", () => {
    expect(provider.code).toBe("MANUAL");
    expect(provider.name).toBe("Manual / Sin API");
    expect(provider.supportedModes).toEqual(["COURIER", "EXTERNAL_OWN_FLEET", "STORE_PICKUP"]);
    expect(provider.canQuote).toBe(false);
    expect(provider.canPrintLabel).toBe(false);
    expect(provider.canTrack).toBe(false);
    expect(provider.canWebhook).toBe(false);
    expect(provider.requiredConfig).toEqual([]);
  });

  it("should create shipment with tracking number", async () => {
    const ctx: CreateShipmentContext = {
      shipmentId: "test-shipment-1",
      trackingNumber: "MANUAL-12345",
      carrierName: "Manual Carrier",
      recipient: {
        name: "Juan Perez",
        phone: "5551234567",
      },
      address: {
        street: "Av. Principal",
        number: "123",
        city: "Ciudad de Mexico",
        state: "CDMX",
        zipCode: "01000",
      },
      mode: "COURIER",
      carrierConfig: {},
    };

    const result = await provider.createShipment(ctx);

    expect(result.trackingNumber).toBe("MANUAL-12345");
    expect(result.providerRef).toBe("manual-test-shipment-1");
    expect(result.service).toBe("Manual");
    expect(result.labelUrl).toBeUndefined();
    expect(result.trackingUrl).toBeUndefined();
  });

  it("should generate tracking number if not provided", async () => {
    const ctx: CreateShipmentContext = {
      shipmentId: "test-shipment-2",
      carrierName: "Manual Carrier",
      recipient: {
        name: "Maria Lopez",
        phone: "5559876543",
      },
      address: {
        street: "Calle Secundaria",
        number: "456",
        city: "Guadalajara",
        state: "JAL",
        zipCode: "44100",
      },
      mode: "PICKUP",
      carrierConfig: {},
    };

    const result = await provider.createShipment(ctx);

    expect(result.trackingNumber).toMatch(/^MAN-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(result.providerRef).toBe("manual-test-shipment-2");
  });

  it("should return empty tracking events", async () => {
    const events = await provider.track("manual-ref", {});
    expect(events).toEqual([]);
  });

  it("should validate config as always valid", () => {
    const validation = provider.validateConfig({});
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });
});
