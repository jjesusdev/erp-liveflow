import { createHmac, timingSafeEqual } from "crypto";
import axios from "axios";

const MP_API = "https://api.mercadopago.com";

export function getMercadoPagoToken(): string | null {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token || token === "TEST-xxx" || token.length < 20) return null;
  return token;
}

export interface PaymentPreference {
  id: string;
  url: string;
}

/** Cliente HTTP único de MercadoPago (antes duplicado en server/ y en la ruta de cobros). */
export async function createPaymentPreference({
  amount,
  concept,
  orderId,
  currency = "MXN",
}: {
  amount: number;
  concept: string;
  orderId: string;
  currency?: string;
}): Promise<PaymentPreference | null> {
  const token = getMercadoPagoToken();
  if (!token) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  try {
    const response = await axios.post(
      `${MP_API}/checkout/preferences`,
      {
        items: [
          {
            title: concept,
            quantity: 1,
            currency_id: currency,
            unit_price: amount,
          },
        ],
        external_reference: orderId,
        back_urls: {
          success: `${appUrl}/caja?paid=${orderId}`,
          pending: `${appUrl}/caja?pending=${orderId}`,
          failure: `${appUrl}/caja?failure=${orderId}`,
        },
        auto_return: "approved",
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return {
      id: response.data.id,
      url: response.data.sandbox_init_point || response.data.init_point,
    };
  } catch (error) {
    console.error("[mercadopago] No se pudo crear la preferencia:", error);
    return null;
  }
}

export async function getPayment(paymentId: string) {
  const token = getMercadoPagoToken();
  if (!token) throw new Error("MP_ACCESS_TOKEN no configurado");
  const response = await axios.get(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data as {
    status: string;
    external_reference?: string;
    [key: string]: unknown;
  };
}

/**
 * Verifica la firma x-signature de MercadoPago (HMAC-SHA256 del manifest
 * `id:[data.id];request-id:[x-request-id];ts:[ts]`).
 * Si no hay secreto configurado se omite fuera de producción para no romper entornos demo.
 */
export function verifyWebhookSignature({
  signature,
  requestId,
  paymentId,
  ts,
}: {
  signature: string | null;
  requestId: string | null;
  paymentId: string;
  ts: string | null;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[mercadopago] MP_WEBHOOK_SECRET no configurado en producción");
      return false;
    }
    return true;
  }
  if (!signature || !requestId || !ts) return false;

  const parts = Object.fromEntries(
    signature.split(",").map((chunk) => {
      const [key, value] = chunk.trim().split("=");
      return [key, value ?? ""];
    })
  );
  const received = parts.v1;
  if (!received) return false;

  // El manifest oficial de MercadoPago termina con ';'.
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
