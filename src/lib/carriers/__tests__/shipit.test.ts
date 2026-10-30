/**
 * Tests de unidad para el provider SHIPIT con fetch mockeado.
 * No realizan llamadas HTTP reales.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ShipitProvider } from "../providers/shipit";
import type { CreateShipmentContext } from "../types";

const provider = new ShipitProvider();

const baseCtx: CreateShipmentContext = {
  shipmentId: "ord-123",
  recipient: { name: "Cliente Test", phone: "+56912345678", email: "c@test.cl" },
  address: {
    street: "Av. Siempre Viva",
    number: "742",
    city: "Santiago",
    state: "RM",
    zipCode: "7500000",
  },
  mode: "COURIER",
  carrierConfig: {},
};

const credsConfig = {
  apiKey: "test-api-key",
  apiSecret: "test-api-secret",
};

type MockFetch = ReturnType<typeof vi.fn>;

let fetchMock: MockFetch;
const originalEnv = { ...process.env };

function mockFetchResponse(body: unknown, status = 200) {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => body,
  } as Response);
}

function mockFetchError(message = "Network error") {
  fetchMock.mockRejectedValue(new TypeError(message));
}

beforeEach(() => {
  vi.restoreAllMocks();
  fetchMock = vi.fn();
  vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock as unknown as typeof fetch);

  // Sin variables de entorno de Shipit para que el stub se active solo por falta de credenciales
  delete process.env.SHIPIT_API_KEY;
  delete process.env.SHIPIT_API_SECRET;
  delete process.env.SHIPIT_BASE_URL;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("ShipitProvider", () => {
  describe("metadatos", () => {
    it("tiene el código, nombre y capacidades correctos", () => {
      expect(provider.code).toBe("SHIPIT");
      expect(provider.name).toBe("Shipit");
      expect(provider.supportedModes).toEqual(["COURIER"]);
      expect(provider.canQuote).toBe(false);
      expect(provider.canPrintLabel).toBe(true);
      expect(provider.canTrack).toBe(true);
      expect(provider.canWebhook).toBe(false);
      expect(provider.requiredConfig).toEqual(["apiKey", "apiSecret"]);
    });
  });

  describe("createShipment sin credenciales (stub fallback)", () => {
    it("retorna tracking ficticio y NO llama a fetch", async () => {
      const result = await provider.createShipment({ ...baseCtx, carrierConfig: {} });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.trackingNumber).toBe("SHIP-ord-123");
      expect(result.providerRef).toBe("shipit-ord-123");
      expect(result.service).toBe("Standard");
      expect(result.rawResponse?.note).toContain("Stub simulado");
    });

    it("usa trackingNumber del contexto si se provee", async () => {
      const result = await provider.createShipment({
        ...baseCtx,
        trackingNumber: "MANUAL-123",
        carrierConfig: {},
      });
      expect(result.trackingNumber).toBe("MANUAL-123");
    });
  });

  describe("createShipment con credenciales (llamada HTTP real)", () => {
    it("llama a la API de Shipit y mapea la respuesta", async () => {
      mockFetchResponse({
        id: "shp_abc123",
        tracking_number: "TRK-99999",
        service: "Express",
        label_url: "https://api.shipit.cl/labels/shp_abc123.pdf",
        tracking_url: "https://api.shipit.cl/track/TRK-99999",
        cost_clp: 4500,
      });

      const result = await provider.createShipment({
        ...baseCtx,
        carrierConfig: credsConfig,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.shipit.cl/v1/shipments");
      expect(init.method).toBe("POST");
      expect(init.headers["X-Api-Key"]).toBe("test-api-key");
      expect(init.headers["X-Api-Secret"]).toBe("test-api-secret");
      expect(JSON.parse(init.body as string)).toMatchObject({
        recipient_name: "Cliente Test",
        recipient_phone: "+56912345678",
        address_city: "Santiago",
      });

      expect(result.trackingNumber).toBe("TRK-99999");
      expect(result.providerRef).toBe("shp_abc123");
      expect(result.service).toBe("Express");
      expect(result.labelUrl).toBe("https://api.shipit.cl/labels/shp_abc123.pdf");
      expect(result.trackingUrl).toBe("https://api.shipit.cl/track/TRK-99999");
      expect(result.costClp).toBe(4500);
      expect(result.rawResponse).toEqual({
        id: "shp_abc123",
        tracking_number: "TRK-99999",
        service: "Express",
        label_url: "https://api.shipit.cl/labels/shp_abc123.pdf",
        tracking_url: "https://api.shipit.cl/track/TRK-99999",
        cost_clp: 4500,
      });
    });

    it("usa credenciales de variables de entorno cuando la config no las tiene", async () => {
      process.env.SHIPIT_API_KEY = "env-key";
      process.env.SHIPIT_API_SECRET = "env-secret";
      mockFetchResponse({ id: "shp_env", tracking_number: "TRK-ENV" });

      const result = await provider.createShipment({
        ...baseCtx,
        carrierConfig: {},
      });

      expect(result.providerRef).toBe("shp_env");
      expect(result.trackingNumber).toBe("TRK-ENV");
    });

    it("lanza error cuando la API de Shipit responde 4xx/5xx", async () => {
      mockFetchResponse({ message: "Credenciales inválidas" }, 401);

      await expect(
        provider.createShipment({ ...baseCtx, carrierConfig: credsConfig })
      ).rejects.toThrow("Shipit API respondió 401");
    });

    it("lanza error con mensaje normalizado cuando falla la red", async () => {
      mockFetchError("Failed to fetch");

      await expect(
        provider.createShipment({ ...baseCtx, carrierConfig: credsConfig })
      ).rejects.toThrow("Error de red consultando Shipit");
    });
  });

  describe("track sin credenciales (stub)", () => {
    it("retorna array vacío y NO llama a fetch", async () => {
      const events = await provider.track("shipit-ord-123", {});
      expect(fetchMock).not.toHaveBeenCalled();
      expect(events).toEqual([]);
    });
  });

  describe("track con credenciales (llamada HTTP real)", () => {
    it("llama a la API de tracking y mapea los eventos", async () => {
      mockFetchResponse({
        events: [
          {
            status: "PICKED_UP",
            occurred_at: "2026-10-30T10:00:00Z",
            description: "Recibido en bodega",
            location: "Santiago",
          },
          {
            status: "DELIVERED",
            occurred_at: "2026-10-31T12:30:00Z",
            description: "Entregado al destinatario",
            location: "Providencia",
          },
        ],
      });

      const events = await provider.track("shipit-ord-123", credsConfig);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.shipit.cl/v1/shipments/shipit-ord-123/tracking");

      expect(events).toHaveLength(2);
      expect(events[0].status).toBe("PICKED_UP");
      expect(events[0].description).toBe("Recibido en bodega");
      expect(events[0].location).toBe("Santiago");
      expect(events[1].status).toBe("DELIVERED");
      expect(events[1].description).toBe("Entregado al destinatario");
      expect(events[1].location).toBe("Providencia");
      expect(events[0].rawData?.status).toBe("PICKED_UP");
    });
  });

  describe("validateConfig", () => {
    it("es válida con apiKey y apiSecret", () => {
      expect(provider.validateConfig(credsConfig)).toEqual({ valid: true, errors: [] });
    });

    it("rechaza falta de apiKey", () => {
      expect(provider.validateConfig({ apiSecret: "s" })).toEqual({
        valid: false,
        errors: ["Configuración requerida faltante: apiKey"],
      });
    });

    it("rechaza falta de apiSecret", () => {
      expect(provider.validateConfig({ apiKey: "k" })).toEqual({
        valid: false,
        errors: ["Configuración requerida faltante: apiSecret"],
      });
    });

    it("rechaza valores vacíos", () => {
      expect(provider.validateConfig({ apiKey: " ", apiSecret: "" })).toEqual({
        valid: false,
        errors: [
          "Configuración requerida faltante: apiKey",
          "Configuración requerida faltante: apiSecret",
        ],
      });
    });
  });
});
